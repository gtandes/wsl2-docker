import React, { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDebounce } from "usehooks-ts";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import {
  useGetAllCategoriesQuery,
  useGetAllExamsForReportsFilterQuery,
} from "api";
import { withAuth } from "../../../../../hooks/withAuth";
import { useAgency } from "../../../../../hooks/useAgency";
import { useAdminTable } from "../../../../../hooks/useAdminTable";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { ExamReportLayout } from "../../../../../components/admin/reports/exams/ExamReportLayout";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { CustomCombobox } from "../../../../../components/admin/anccReports/CustomCombobox";
import Button from "../../../../../components/Button";
import DateInputControlled from "../../../../../components/DateInputControlled";
import { HSHAdminOnly } from "../../../../../types/roles";
import { DirectusStatus, CategoryType } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../../types/global";
import {
  useReportGenerator,
  FormValues,
  formSchema,
} from "../../../../../hooks/useReportPassRateGenerator";
import { Spinner } from "../../../../../components/Spinner";

interface Option {
  label: string;
  value: string;
}

const DEBOUNCE_TIME = 500;
const PAGE_SIZE = 10;

const ExamPassRateReport: React.FC = () => {
  const [modalitySearchQuery, setModalitySearchQuery] = useState("");
  const [titleNameQuery, setTitleNameQuery] = useState("");
  const { currentAgency } = useAgency();

  const {
    generateCsv,
    reportData: generatedReportData,
    isGeneratingCsv,
    downloadCsv,
  } = useReportGenerator(currentAgency?.id, "exams");
  const debouncedModalityQuery = useDebounce(
    modalitySearchQuery,
    DEBOUNCE_TIME
  );
  const debouncedContentNameQuery = useDebounce(titleNameQuery, DEBOUNCE_TIME);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modality: null,
      startDate: "",
      endDate: "",
      contentName: null,
    },
  });

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [{ id: "title", desc: false }])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, { pageIndex: 0, pageSize: PAGE_SIZE })
  );

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
    }
  );

  const selectedModality = watch("modality") as unknown as {
    label: string;
    value: string;
  } | null;

  const agencyId = currentAgency?.id;

  const filtersQuery = useGetAllExamsForReportsFilterQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedContentNameQuery ?? "",
      filter: {
        modality: selectedModality?.value
          ? { id: { _eq: selectedModality.value } }
          : undefined,
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(agencyId
          ? { directus_users: { agency: { id: { _eq: agencyId } } } }
          : {}),
      },
    },
    skip: false,
  });

  const titleNameOptions: Option[] = useMemo(() => {
    return (
      filtersQuery?.data?.exams?.map((exam) => ({
        label: exam.title || "",
        value: exam.id,
      })) || []
    );
  }, [filtersQuery?.data?.exams]);

  const modalityOptions = useMemo(() => {
    return [
      { label: "All", value: "" },
      ...(modality?.categories?.map((category) => ({
        label: category.title,
        value: category.id,
      })) || []),
    ];
  }, [modality?.categories]);

  const paginationState = useMemo(() => {
    return {
      pageIndex: page.pageIndex,
      pageSize: PAGE_SIZE,
    };
  }, [page.pageIndex]);

  const paginatedReportData = useMemo(() => {
    if (!generatedReportData?.length) return [];

    const startIndex = paginationState.pageIndex * paginationState.pageSize;
    const endIndex = startIndex + paginationState.pageSize;

    return generatedReportData.slice(startIndex, endIndex);
  }, [generatedReportData, paginationState]);

  const adminTable = useAdminTable({
    columns: [
      {
        header: "Title",
        accessorKey: "title",
        id: "title",
        enableSorting: false,
      },
      {
        header: "Modality",
        accessorKey: "modality",
        id: "modality",
        enableSorting: false,
      },
      {
        header: "Pass Rate",
        accessorKey: "rate",
        id: "rate",
        enableSorting: false,
      },
      {
        header: "Pass Rate for Other Agencies",
        accessorKey: "passRateOtherAgencies",
        id: "passRateOtherAgencies",
        enableSorting: false,
      },
    ],
    data: paginatedReportData,
    pageCount: Math.ceil((generatedReportData?.length ?? 0) / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: isGeneratingCsv,
    totalItems: generatedReportData?.length ?? 0,
  });

  const onSubmit = async (formData: FormValues) => {
    await generateCsv(formData);
  };

  useEffect(() => {
    setValue("contentName", null);
  }, [agencyId, modality, setValue]);

  return (
    <ReportLayout>
      <ExamReportLayout>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col justify-between align-middle md:flex-row">
            <div className="flex flex-row items-baseline gap-2">
              <h1 className="mb-3 text-xl font-semibold">
                Pass Rate Comparison
              </h1>
              <FilterComboInfoTooltip />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="submit"
                label={isGeneratingCsv ? "Generating..." : "Generate Data"}
                variant="solid"
                disabled={isGeneratingCsv}
              />
              <Button
                onClick={downloadCsv}
                label={isGeneratingCsv ? "Generating..." : "Download CSV"}
                variant="solid"
                disabled={isGeneratingCsv || generatedReportData?.length === 0}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              options={titleNameOptions}
              control={control}
              name="contentName"
              query={titleNameQuery}
              setQuery={setTitleNameQuery}
              getLabel={(val) => val?.label || ""}
              by="value"
              label="Title"
              placeholder="Filter by Title"
              loading={filtersQuery.loading}
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
        {isGeneratingCsv && <Spinner />}

        <adminTable.Component />
      </ExamReportLayout>
    </ReportLayout>
  );
};

export default withAuth(ExamPassRateReport, HSHAdminOnly);
