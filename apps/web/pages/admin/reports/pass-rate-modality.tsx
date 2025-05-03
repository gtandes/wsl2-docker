import React, { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDebounce } from "usehooks-ts";

import {
  useGetAllAgenciesQuery,
  useGetAllCategoriesQuery,
  useGetAllExamsForReportsFilterQuery,
  useGetModulesForFilterQuery,
} from "api";
import Button from "../../../components/Button";
import AnccReportsLayout from "../../../components/admin/anccReports/AnccReportsLayout";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { CategoryType, CompetencyType, DirectusStatus } from "types/global";
import DateInputControlled from "../../../components/DateInputControlled";
import { CustomCombobox } from "../../../components/admin/anccReports/CustomCombobox";
import { directus } from "../../../utils/directus";
import {
  ALL_FIELDS_ARE_REQUIRED,
  notify,
} from "../../../components/Notification";
import { useAgency } from "../../../hooks/useAgency";
import { withAuth } from "../../../hooks/withAuth";
import { HSHAdminOnly } from "../../../types/roles";
import { decompressGzip } from "../../../utils/utils";

const DEBOUNCE_TIME = 500;
const EXAM_OR_MODULE_OPTIONS = [
  { label: CompetencyType.EXAM, value: "exams" },
  { label: CompetencyType.MODULE, value: "modules" },
];

const schema = z.object({
  agency: z
    .object({ label: z.string().optional(), value: z.string().optional() })
    .nullable(),
  modality: z
    .object({ label: z.string().optional(), value: z.string().optional() })
    .nullable(),
  contentName: z.object({ label: z.string(), value: z.string() }).nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  examOrModule: z.object({ label: z.string(), value: z.string() }).nullable(),
});
type FormValues = z.infer<typeof schema>;

// Main Component
const PassRateModalityReport: React.FC = () => {
  // Form Handling
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      modality: null,
      agency: null,
      startDate: "",
      endDate: "",
      examOrModule: null,
      contentName: null,
    },
  });

  const globalAgency = useAgency();

  const [isLoading, setIsLoading] = useState(false);
  const [agencySearch, setAgencySearch] = useState("");
  const [modalitySearchQuery, setModalitySearchQuery] = useState("");
  const [contentNameQuery, setContentNameQuery] = useState("");
  const [isTitleDisabled, setIsTitleDisabled] = React.useState(false);

  const debouncedAgencyQuery = useDebounce(agencySearch, DEBOUNCE_TIME);
  const debouncedModalityQuery = useDebounce(
    modalitySearchQuery,
    DEBOUNCE_TIME
  );
  const debouncedContentNameQuery = useDebounce(
    contentNameQuery,
    DEBOUNCE_TIME
  );

  const selectedAgency = watch("agency");
  const selectedExamOrModule = watch("examOrModule");
  const selectedModality = watch("modality");

  const agencyId = selectedAgency?.value || "";
  const selectedType = selectedExamOrModule?.value || "";

  const [createdBy, setCreatedBy] = useState("");

  const { loading: loadingAgency } = useGetAllAgenciesQuery({
    variables: {
      filter: { status: { _eq: "published" } },
      sort: ["name"],
      search: debouncedAgencyQuery,
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: modality, loading: loadingModality } = useGetAllCategoriesQuery(
    {
      variables: {
        search: debouncedModalityQuery,
        limit: COMBOBOX_RESULTS_AMOUNT,
        filter: {
          status: { _eq: DirectusStatus.PUBLISHED },
          type: { _eq: CategoryType.MODALITY },
        },
      },
      fetchPolicy: "cache-and-network",
    }
  );

  const filtersQuery = useGetAllExamsForReportsFilterQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedContentNameQuery,
      filter: agencyId
        ? {
            _and: [
              { status: { _eq: DirectusStatus.PUBLISHED } },
              ...(selectedModality?.value
                ? [{ modality: { id: { _eq: selectedModality.value } } }]
                : []),
              {
                directus_users: {
                  agency: { id: { _eq: agencyId } },
                },
              },
            ],
          }
        : { status: { _eq: DirectusStatus.PUBLISHED } },
    },
    skip: false,
  });

  const moduleFilterQuery = useGetModulesForFilterQuery({
    variables: {
      search: debouncedContentNameQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: agencyId
        ? {
            _and: [
              { status: { _eq: DirectusStatus.PUBLISHED } },
              ...(selectedModality?.value
                ? [{ modality: { id: { _eq: selectedModality.value } } }]
                : []),
              {
                directus_users: {
                  agency: { id: { _eq: agencyId } },
                },
              },
            ],
          }
        : { status: { _eq: DirectusStatus.PUBLISHED } },
    },
    skip: false,
  });

  const modalityOptions = useMemo(() => {
    return (
      modality?.categories?.map((category) => ({
        label: category.title,
        value: category.id,
      })) || []
    );
  }, [modality?.categories]);

  const contentNameOptions = useMemo(() => {
    if (selectedType === "exams") {
      return (
        filtersQuery?.data?.exams?.map((exam) => ({
          label: exam.title || "",
          value: exam.id,
        })) || []
      );
    } else if (selectedType === "modules") {
      return (
        moduleFilterQuery?.data?.modules_definition?.map((module) => ({
          label: module.title || "",
          value: module.id,
        })) || []
      );
    }
    return [
      ...(filtersQuery?.data?.exams?.map((exam) => ({
        label: exam.title || "",
        value: exam.id,
      })) || []),
      ...(moduleFilterQuery?.data?.modules_definition?.map((module) => ({
        label: module.title || "",
        value: module.id,
      })) || []),
    ];
  }, [
    selectedType,
    filtersQuery?.data?.exams,
    moduleFilterQuery?.data?.modules_definition,
  ]);

  const agenciesOptions = useMemo(() => {
    if (!globalAgency.agencies) return [];
    return globalAgency.agencies.map((agency) => ({
      label: agency.name,
      value: agency.id,
    }));
  }, [globalAgency.agencies]);

  const handleDownload = async (reportId: string) => {
    try {
      const response = await fetch(
        `/api/v1/reports/get-csv-report?id=${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${await directus.auth.token}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Download error:", error);
        notify({ type: "error", description: error.message });
        return;
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const decompressedData = await decompressGzip(arrayBuffer);

      const csvBlob = new Blob([decompressedData], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csvBlob);
      link.download = "pass-rate-per-modality.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsLoading(false);
      await fetch(`/api/v1/reports/set-csv-report-downloaded?id=${reportId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await directus.auth.token}`,
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Error downloading the report", error);
      notify({ type: "error", description: "Failed to download the report" });
    }
  };

  const startSSE = async (reportId: string) => {
    try {
      const token = await directus.auth.token;
      const response = await fetch(
        `/api/v1/reports/generate-status?id=${reportId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to start SSE connection.");
      const body = response.body;
      if (!body) throw new Error("No response body found for SSE connection.");

      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const messages = buffer.split("\n").filter(Boolean);

        buffer = messages.pop() || "";

        if (buffer) {
          await handleMessage(buffer, reportId);
        }
      }
    } catch (error) {
      console.error("Error in SSE connection:", error);
      notify({
        type: "error",
        description: "Error while receiving data from the server.",
      });
    }
  };

  const handleMessage = async (message: string, reportId: string) => {
    try {
      const data = JSON.parse(message.substring(5));

      if (data.status === "completed") {
        await handleDownload(reportId);
        setIsLoading(false);
      } else if (data.status === "failed") {
        notify({
          type: "error",
          description: "Failed to generate the report.",
        });
      } else {
        setIsLoading(true);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  const fetchReports = async (type = "pass-rate-per-modality", limit = 1) => {
    if (!directus?.auth) return;

    try {
      await directus.auth.refreshIfExpired();
      const token = await directus.auth.token;
      const url = new URL(
        `/api/v1/reports/ancc-reports?type=${type}&limit=${limit}`,
        window.location.origin
      );

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[fetchReports] Error:", error.message);
        notify({
          type: "error",
          description: `Failed to load reports: ${error.message}`,
        });
        return;
      }

      const result = await response.json();
      const reports = result.data || [];
      if (reports.length > 0) {
        const reportId = reports[0].id;
        const created_by = reports[0].created_by;

        setCreatedBy(created_by);
        startSSE(reportId);
      }
    } catch (error) {
      console.error("[fetchReports] Error:", error);
      notify({
        type: "error",
        description: `Failed to load reports: ${error}`,
      });
    }
  };

  async function onSubmit(data: FormValues) {
    if (
      !data.agency ||
      !data.modality ||
      !data.contentName ||
      !data.examOrModule ||
      !data.startDate ||
      !data.endDate
    ) {
      return notify(ALL_FIELDS_ARE_REQUIRED);
    }

    setIsLoading(true);
    const titleValue = data.contentName ? data.contentName.label : "";

    const queryParams = new URLSearchParams({
      agency: data.agency.value || "",
      modality: data.modality.value || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      type: data.examOrModule.value || "",
      title: data.contentName.value || "",
    });

    const reportUrl = new URL(
      `/api/v1/reports/pass-rate-per-modality?${queryParams}`,
      window.location.origin
    );

    try {
      const response = await fetch(reportUrl.toString(), {
        headers: { Authorization: `Bearer ${await directus.auth.token}` },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        notify({ type: "error", description: error.message });
        setIsLoading(false);
        return;
      }

      notify({ type: "success", description: "Report generation started!" });
      await new Promise((resolve) => setTimeout(resolve, 5000));

      fetchReports();
    } catch (error) {
      console.error("Error submitting the report:", error);
      notify({ type: "error", description: "Failed to generate the report." });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedExamOrModule?.label === "All") {
      setContentNameQuery("All");
      setIsTitleDisabled(true);
      setValue("contentName", { label: "All", value: "" });
    } else {
      setIsTitleDisabled(false);
      setValue("contentName", null);
    }
  }, [selectedExamOrModule]);

  return (
    <AnccReportsLayout>
      <form
        className="mt-5 flex flex-col gap-5 rounded-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Pass Rate Per Modality Type</h3>
          <Button
            type="submit"
            label={isLoading ? "Generating..." : "Export CSV/report"}
            variant="solid"
            disabled={isLoading}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CustomCombobox
            options={EXAM_OR_MODULE_OPTIONS}
            control={control}
            name="examOrModule"
            query={modalitySearchQuery}
            setQuery={setModalitySearchQuery}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Exam or Module"
            placeholder="Select Exam or Module"
            loading={loadingAgency}
          />
          <CustomCombobox
            options={agenciesOptions}
            control={control}
            name="agency"
            query={agencySearch}
            setQuery={setAgencySearch}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Agency"
            placeholder="Filter by Agency"
            loading={loadingAgency}
          />
          <CustomCombobox
            options={modalityOptions}
            control={control}
            name="modality"
            query={modalitySearchQuery}
            setQuery={setModalitySearchQuery}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Modality"
            placeholder="Filter by Modality"
            loading={loadingModality}
          />
          <CustomCombobox
            options={contentNameOptions}
            control={control}
            name="contentName"
            query={contentNameQuery}
            setQuery={setContentNameQuery}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Title"
            placeholder="Filter by Title"
            loading={filtersQuery.loading || moduleFilterQuery.loading}
            disabled={isTitleDisabled}
          />
          <DateInputControlled
            register={control.register("startDate")}
            label="Start Date"
            error={errors.startDate}
          />
          <DateInputControlled
            register={control.register("endDate")}
            label="End Date"
            error={errors.endDate}
          />
        </div>
      </form>
    </AnccReportsLayout>
  );
};

export default withAuth(PassRateModalityReport, HSHAdminOnly);
