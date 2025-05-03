import { useReducer, useCallback, useEffect, useRef } from "react";
import { notify, ALL_FIELDS_ARE_REQUIRED } from "../components/Notification";
import { decompressGzip, query } from "../utils/utils";
import { z } from "zod";

export const schema = z.object({
  contentName: z
    .object({
      label: z.string(),
      value: z.string(),
    })
    .nullable(),

  agency: z
    .object({
      label: z.string(),
      value: z.string(),
    })
    .nullable(),

  selectedQuestion: z
    .object({
      label: z.string(),
      value: z.string(),
    })
    .nullable(),

  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

const MAX_RETRIES = 5;
const INITIAL_INTERVAL = 3000;
const MAX_INTERVAL = 30000;

interface ReportState {
  reportUUID: string;
  isGeneratingCsv: boolean;
  isIntervalOn: boolean;
  retryCount: number;
  retryDelay: number;
}

const ActionTypes = {
  SET_REPORT_UUID: "SET_REPORT_UUID",
  SET_IS_GENERATING_CSV: "SET_IS_GENERATING_CSV",
  SET_IS_INTERVAL_ON: "SET_IS_INTERVAL_ON",
  INCREMENT_RETRY_COUNT: "INCREMENT_RETRY_COUNT",
  RESET_RETRY_STATE: "RESET_RETRY_STATE",
} as const;

type Action =
  | { type: typeof ActionTypes.SET_REPORT_UUID; payload: string }
  | { type: typeof ActionTypes.SET_IS_GENERATING_CSV; payload: boolean }
  | { type: typeof ActionTypes.SET_IS_INTERVAL_ON; payload: boolean }
  | { type: typeof ActionTypes.INCREMENT_RETRY_COUNT }
  | { type: typeof ActionTypes.RESET_RETRY_STATE };

const createInitialState = (): ReportState => ({
  reportUUID: "",
  isGeneratingCsv: false,
  isIntervalOn: false,
  retryCount: 0,
  retryDelay: INITIAL_INTERVAL,
});

const handleError = (
  error: unknown,
  context: string,
  dispatch: React.Dispatch<Action>
) => {
  console.error(`Error in ${context}:`, error);

  const defaultErrorMessage = `Failed to ${context}. Please try again.`;
  const descriptionError =
    context === "fetch report status" && error instanceof Error
      ? error.message
      : defaultErrorMessage;

  dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
  dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });

  notify({
    type: "error",
    description: descriptionError,
  });
};

const reportReducer = (state: ReportState, action: Action): ReportState => {
  switch (action.type) {
    case ActionTypes.SET_REPORT_UUID:
      return { ...state, reportUUID: action.payload };
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
      };
    default:
      return state;
  }
};

export const useReportGenerator = () => {
  const [state, dispatch] = useReducer(reportReducer, createInitialState());
  const isRequestInProgressRef = useRef(false);

  const generateCsv = useCallback(
    async (formData: FormValues): Promise<void> => {
      if (
        !formData.contentName ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.agency
      ) {
        notify(ALL_FIELDS_ARE_REQUIRED);
        return;
      }

      dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: true });

      try {
        const params = new URLSearchParams({
          ...(formData.agency?.value && { agency: formData.agency.value }),
          ...(formData.contentName?.value && {
            title: formData.contentName.value,
          }),
          ...(formData.startDate && { startDate: formData.startDate }),
          ...(formData.endDate && { endDate: formData.endDate }),
          ...(formData.selectedQuestion?.value && {
            selectedQuestion: formData.selectedQuestion.value,
          }),
        });

        const response = await query(
          `/api/v1/reports/exam-pass-rate-v2?${params.toString()}`,
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
    []
  );

  const downloadCsv = useCallback(async () => {
    if (!state.reportUUID) return;

    try {
      const response = await query(
        `/api/v1/reports/get-csv-report?id=${state.reportUUID}`,
        "GET"
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const decompressedData = await decompressGzip(arrayBuffer);
      const csvBlob = new Blob([decompressedData], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "exam-question-rate-report.csv";
      link.click();
    } catch (error) {
      notify({
        type: "error",
        description: "Failed to download the report.",
      });
      console.error(error);
    }
  }, [state.reportUUID]);

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
        const errMessage = data[0].file_content || "Report generation failed";
        handleError(new Error(errMessage), "fetch report status", dispatch);
        dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: "" });
        dispatch({ type: ActionTypes.SET_IS_GENERATING_CSV, payload: false });
        dispatch({ type: ActionTypes.SET_IS_INTERVAL_ON, payload: false });
        return;
      }

      if (data[0].status === "completed" || data[0].status === "downloaded") {
        await downloadCsv();
        dispatch({ type: ActionTypes.SET_REPORT_UUID, payload: "" });
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
  }, [state.reportUUID, state.retryCount, downloadCsv]);

  useEffect(() => {
    if (state.isIntervalOn) {
      const interval = setInterval(fetchReportDataStatus, state.retryDelay);
      return () => clearInterval(interval);
    }
  }, [state.isIntervalOn, fetchReportDataStatus, state.retryDelay]);

  useEffect(() => {
    dispatch({ type: ActionTypes.RESET_RETRY_STATE });
  }, []);

  return {
    isGeneratingCsv: state.isGeneratingCsv,
    generateCsv,
  };
};
