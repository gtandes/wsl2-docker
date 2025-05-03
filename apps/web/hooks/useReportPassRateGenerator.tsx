import { useReducer, useCallback, useEffect, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import { notify, ALL_FIELDS_ARE_REQUIRED } from "../components/Notification";
import { decompressGzip, query } from "../utils/utils";
import { z } from "zod";

export const formSchema = z.object({
  modality: z
    .object({
      title: z.string().optional(),
      value: z.string().optional(),
      label: z.string().optional(),
    })
    .nullable(),
  contentName: z.object({ label: z.string(), value: z.string() }).nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

const MAX_RETRIES = 5;
const INITIAL_INTERVAL = 3000;
const MAX_INTERVAL = 30000;

interface CachedReport {
  fileContent: string;
  timestamp: number;
  params: string;
}

interface CachedReports {
  [key: string]: CachedReport;
}

export const ActionTypes = {
  SET_REPORT_UUID: "SET_REPORT_UUID",
  SET_REPORT_DATA: "SET_REPORT_DATA",
  SET_IS_GENERATING_CSV: "SET_IS_GENERATING_CSV",
  SET_IS_INTERVAL_ON: "SET_IS_INTERVAL_ON",
  INCREMENT_RETRY_COUNT: "INCREMENT_RETRY_COUNT",
  RESET_RETRY_STATE: "RESET_RETRY_STATE",
} as const;

interface ReportState {
  reportUUID: string;
  reportData: Record<string, string>[] | null;
  isGeneratingCsv: boolean;
  isIntervalOn: boolean;
  retryCount: number;
  retryDelay: number;
}

type Action =
  | { type: typeof ActionTypes.SET_REPORT_UUID; payload: string }
  | {
      type: typeof ActionTypes.SET_REPORT_DATA;
      payload: Record<string, string>[];
    }
  | { type: typeof ActionTypes.SET_IS_GENERATING_CSV; payload: boolean }
  | { type: typeof ActionTypes.SET_IS_INTERVAL_ON; payload: boolean }
  | { type: typeof ActionTypes.INCREMENT_RETRY_COUNT }
  | { type: typeof ActionTypes.RESET_RETRY_STATE };

const createInitialState = (): ReportState => ({
  reportUUID: "",
  reportData: null,
  isGeneratingCsv: false,
  isIntervalOn: false,
  retryCount: 0,
  retryDelay: INITIAL_INTERVAL,
});

const getCacheKey = (agencyId: string, passRateType: string, params: string) =>
  `${agencyId}-${passRateType}-${params}`;

const handleError = (
  error: unknown,
  context: string,
  dispatch: React.Dispatch<Action>
) => {
  console.error(`Error in ${context}:`, error);
  dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
  dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });
  notify({
    type: "error",
    description: `Failed to ${context}. Please try again.`,
  });
};

const parseAndRenameCsv = (
  csvContent: string,
  headerMap: Record<string, string>
) => {
  const cleanedContent = csvContent
    .replace(/\\"/g, '"')
    .replace(/(^"|"$)/g, "");

  const splitCsvRow = (row: string) => {
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    const values: string[] = [];
    let match;
    while ((match = regex.exec(row)) !== null) {
      values.push(match[1] || match[2] || "");
    }
    return values;
  };

  const rows = cleanedContent.split("\n").filter(Boolean);
  const headers = splitCsvRow(rows[0]).map((header) =>
    header.trim().replace(/(^"|"$)/g, "")
  );
  const mappedHeaders = headers.map((header) => headerMap[header] || header);

  return rows.slice(1).map((row) => {
    const values = splitCsvRow(row).map((value) =>
      value.trim().replace(/(^"|"$)/g, "")
    );
    return mappedHeaders.reduce((acc, header, index) => {
      acc[header] = values[index];
      return acc;
    }, {} as Record<string, string>);
  });
};

const reportReducer = (state: ReportState, action: Action): ReportState => {
  switch (action.type) {
    case ActionTypes.SET_REPORT_UUID:
      return { ...state, reportUUID: action.payload };
    case ActionTypes.SET_REPORT_DATA:
      return { ...state, reportData: action.payload };
    case ActionTypes.SET_IS_GENERATING_CSV:
      return { ...state, isGeneratingCsv: action.payload };
    case ActionTypes.SET_IS_INTERVAL_ON:
      return { ...state, isIntervalOn: action.payload };
    case ActionTypes.INCREMENT_RETRY_COUNT:
      return {
        ...state,
        retryCount: state.retryCount + 1,
        retryDelay: Math.min(
          state.retryDelay * 2 + Math.floor(Math.random() * 1000),
          MAX_INTERVAL
        ),
      };
    case ActionTypes.RESET_RETRY_STATE:
      return {
        ...state,
        retryCount: 0,
        retryDelay: INITIAL_INTERVAL,
        reportData: [],
      };
    default:
      return state;
  }
};

export const useReportGenerator = (
  agencyId?: string,
  passRateType?: string
) => {
  const [state, dispatch] = useReducer(reportReducer, createInitialState());
  const [cachedReports, setCachedReports] = useLocalStorage<CachedReports>(
    "cached-reports",
    {}
  );
  const isRequestInProgressRef = useRef(false);

  const generateCacheKey = useCallback(
    (formData: FormValues) => {
      const params = new URLSearchParams({
        ...(formData.modality?.value && { modality: formData.modality.value }),
        ...(formData.contentName?.value && {
          title: formData.contentName.value,
        }),
        ...(formData.startDate && { startDate: formData.startDate }),
        ...(formData.endDate && { endDate: formData.endDate }),
      }).toString();

      return getCacheKey(agencyId || "", passRateType || "", params);
    },
    [agencyId, passRateType]
  );

  const generateCsv = useCallback(
    async (formData: FormValues): Promise<void> => {
      if (
        !formData.modality ||
        !formData.contentName ||
        !formData.startDate ||
        !formData.endDate
      ) {
        notify(ALL_FIELDS_ARE_REQUIRED);
        return;
      }

      if (!agencyId || !passRateType) return;

      const cacheKey = generateCacheKey(formData);
      const cachedData = cachedReports[cacheKey];

      if (cachedData) {
        if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
          const headers = {
            "Competency Title": "title",
            Modality: "modality",
            "Percentage Pass for the Agency": "rate",
            "Overall Percentage Pass for All Agencies": "passRateOtherAgencies",
          };
          const parsedData = parseAndRenameCsv(cachedData.fileContent, headers);
          dispatch({ type: ActionTypes.SET_REPORT_DATA, payload: parsedData });
          dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
          return;
        }
      }

      dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: true });
      try {
        const params = new URLSearchParams({
          agency: agencyId,
          type: passRateType,
          ...(formData.modality.value && { modality: formData.modality.value }),
          ...(formData.contentName?.value && {
            title: formData.contentName.value,
          }),
          ...(formData.startDate && { startDate: formData.startDate }),
          ...(formData.endDate && { endDate: formData.endDate }),
        });

        const response = await query(
          `/api/v1/reports/agency-pass-rate-v2?${params.toString()}`,
          "GET"
        );

        if (!response.ok) throw new Error("Failed to fetch report data");

        const data = await response.json();
        dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: data.uuid });
        dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: true });
        dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: true });
      } catch (error) {
        handleError(error, "generate report", dispatch);
      }
    },
    [agencyId, passRateType, generateCacheKey, cachedReports]
  );

  const fetchReportDataStatus = useCallback(async () => {
    if (isRequestInProgressRef.current) return;
    if (!state.reportUUID) return;
    isRequestInProgressRef.current = true;

    dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: true });

    try {
      const response = await query(
        `/api/v1/reports/get-csv-report-data?id=${state.reportUUID}`,
        "GET"
      );

      if (!response.ok) throw new Error("Failed to fetch report data");

      const { data } = await response.json();

      if (data[0].status === "failed") {
        handleError(
          new Error("Report generation failed"),
          "fetch report status",
          dispatch
        );
        dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: "" });
        dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
        dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });
        return;
      }

      if (data[0].status === "completed" || data[0].status === "downloaded") {
        const headers = {
          "Competency Title": "title",
          Modality: "modality",
          "Percentage Pass for the Agency": "rate",
          "Overall Percentage Pass for All Agencies": "passRateOtherAgencies",
        };

        if (agencyId && passRateType) {
          const cacheKey = getCacheKey(
            agencyId,
            passRateType,
            new URLSearchParams(window.location.search).toString()
          );

          setCachedReports((prev) => ({
            ...prev,
            [cacheKey]: {
              fileContent: data[0].file_content,
              timestamp: Date.now(),
              params: window.location.search,
            },
          }));
        }

        const parsedData = parseAndRenameCsv(data[0].file_content, headers);
        dispatch({ type: ActionTypes.SET_REPORT_DATA, payload: parsedData });
        dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
        dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });
      } else if (
        data[0].status === "in_progress" ||
        data[0].status === "processing"
      ) {
        if (state.retryCount >= MAX_RETRIES) {
          handleError(
            new Error("Max retries reached"),
            "fetch report status",
            dispatch
          );
          dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: "" });
          dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
          dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });
        } else {
          dispatch({ type: ActionTypes.INCREMENT_RETRY_COUNT });
        }
        return;
      }
    } catch (error) {
      if (state.retryCount >= MAX_RETRIES) {
        handleError(error, "fetch report status", dispatch);
        dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: "" });
        dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
      } else {
        dispatch({ type: ActionTypes.INCREMENT_RETRY_COUNT });
      }
    } finally {
      isRequestInProgressRef.current = false;
    }
  }, [
    state.reportUUID,
    state.retryCount,
    agencyId,
    passRateType,
    setCachedReports,
  ]);

  const downloadCsv = async () => {
    if (!state.reportUUID || !state.reportData) return;

    try {
      const response = await query(
        `/api/v1/reports/get-csv-report?id=${state.reportUUID}`,
        "GET"
      );
      if (!response.ok)
        throw new Error(`Failed to fetch report: ${response.statusText}`);

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const decompressedData = await decompressGzip(arrayBuffer);

      const csvBlob = new Blob([decompressedData], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "report.csv";
      link.click();

      await setDownloadedReport();
    } catch (error) {
      notify({
        type: "error",
        description: "Failed to download the report.",
      });
      console.error(error);
    }
  };

  const setDownloadedReport = async () => {
    try {
      const response = await query(
        `/api/v1/reports/set-csv-report-downloaded?id=${state.reportUUID}`,
        "GET"
      );
      if (!response.ok)
        throw new Error(`Failed to fetch report: ${response.statusText}`);
    } catch (error) {
      notify({
        type: "error",
        description: "Failed to set the report downloaded",
      });
      console.error(error);
    }
  };

  useEffect(() => {
    if (state.isIntervalOn) {
      const interval = setInterval(fetchReportDataStatus, state.retryDelay);
      return () => clearInterval(interval);
    }
  }, [state.isIntervalOn, fetchReportDataStatus, state.retryDelay]);

  useEffect(() => {
    dispatch({ type: ActionTypes.RESET_RETRY_STATE });
  }, [agencyId]);

  return {
    reportData: state.reportData,
    isGeneratingCsv: state.isGeneratingCsv,
    reportUUID: state.reportUUID,
    generateCsv,
    downloadCsv,
  };
};
