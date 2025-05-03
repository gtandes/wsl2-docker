import React, { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDebounce } from "usehooks-ts";

import {
  useGetAllAgenciesQuery,
  useGetAllExamsForReportsFilterQuery,
  useGetAllQuestionsQuery,
} from "api";
import Button from "../../../components/Button";
import AnccReportsLayout from "../../../components/admin/anccReports/AnccReportsLayout";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { DirectusStatus } from "types/global";
import DateInputControlled from "../../../components/DateInputControlled";
import { CustomCombobox } from "../../../components/admin/anccReports/CustomCombobox";
import { useAgency } from "../../../hooks/useAgency";
import { SelectOption } from "../../../components/Select";
import {
  ALL_FIELDS_ARE_REQUIRED,
  notify,
} from "../../../components/Notification";
import {
  FormValues,
  schema,
  useReportGenerator,
} from "../../../hooks/useExamQuestionPassRate";
import { withAuth } from "../../../hooks/withAuth";
import { HSHAdminOnly } from "../../../types/roles";

interface ExamData {
  id: string;
}

interface ExamData {
  id: string;
}

interface Option {
  label: string;
  value: string;
}

const DEBOUNCE_TIME = 500;

const ExamPassRateReport: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const globalAgency = useAgency();
  const [agencySearch, setAgencySearch] = useState("");
  const [contentNameQuery, setContentNameQuery] = useState("");
  const [searchQuestionsQuery, setSearchQuestionsQuery] = useState("");

  const debouncedAgencyQuery = useDebounce(agencySearch, DEBOUNCE_TIME);

  const debouncedContentNameQuery = useDebounce(
    contentNameQuery,
    DEBOUNCE_TIME
  );

  const debouncedSearchQuestionsQuery = useDebounce(
    searchQuestionsQuery,
    DEBOUNCE_TIME
  );

  const { isGeneratingCsv, generateCsv } = useReportGenerator();

  const { loading: loadingAgency } = useGetAllAgenciesQuery({
    variables: {
      filter: { status: { _eq: "published" } },
      sort: ["name"],
      search: debouncedAgencyQuery,
    },
    fetchPolicy: "cache-and-network",
  });

  const agenciesOptions = useMemo(() => {
    if (!globalAgency.agencies) return [];
    const agencies = globalAgency.agencies.map((agency) => ({
      label: agency.name,
      value: agency.id,
    }));
    return [...agencies];
  }, [globalAgency.agencies]);

  const selectedAgency = watch("agency") as unknown as {
    label: string;
    value: string;
  } | null;

  const selectedContentName = watch("contentName");

  const agencyId = selectedAgency ? selectedAgency.value : "";

  const filtersQuery = useGetAllExamsForReportsFilterQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedContentNameQuery,
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(agencyId &&
          agencyId !== "" && {
            directus_users: { agency: { id: { _eq: agencyId } } },
          }),
      },
    },
    skip: false,
    fetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const contentNameOptions: Option[] = useMemo(() => {
    filtersQuery?.data?.exams?.map((exam) => ({
      label: exam.title || "",
      value: exam.id,
    })) || [];

    return [
      ...(filtersQuery?.data?.exams?.map((exam) => ({
        label: exam.title || "",
        value: exam.id,
      })) || []),
    ];
  }, [filtersQuery?.data?.exams]);

  const { data: questionData, loading: loadingQuestion } =
    useGetAllQuestionsQuery({
      variables: {
        filter: {
          _and: [
            selectedContentName?.value && selectedContentName.value !== ""
              ? {
                  exam_versions: {
                    exam_versions_id: {
                      exam: {
                        id: { _eq: selectedContentName?.value },
                      },
                    },
                  },
                }
              : {},
            {
              status: { _eq: DirectusStatus.PUBLISHED },
            },
          ],
        },
        search: debouncedSearchQuestionsQuery,
        limit: COMBOBOX_RESULTS_AMOUNT,
      },
      fetchPolicy: "cache-and-network",
      skip: false,
    });

  const questionOptions: SelectOption[] = questionData?.questions.length
    ? questionData.questions.map((question) => ({
        label: String(question.title),
        value: question.id,
        image: question.versions?.[0]?.image || null,
      }))
    : [];

  const onSubmit = async (formData: FormValues) => {
    if (
      !formData.agency ||
      !formData.selectedQuestion ||
      !formData.contentName ||
      !formData.endDate ||
      !formData.startDate
    ) {
      return notify(ALL_FIELDS_ARE_REQUIRED);
    }
    try {
      await generateCsv(formData);
    } catch (error) {
      console.error("Error generating CSV:", error);
    }
  };

  return (
    <AnccReportsLayout>
      <form
        className="mt-5 flex flex-col gap-5 rounded-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            Exam Question Pass Rate Statistics
          </h3>
          <Button
            type="submit"
            label={isGeneratingCsv ? "Generating..." : "Export CSV/report"}
            variant="solid"
            disabled={isGeneratingCsv}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            options={contentNameOptions}
            control={control}
            name="contentName"
            query={contentNameQuery}
            setQuery={setContentNameQuery}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Title"
            placeholder="Filter by Title"
            loading={filtersQuery.loading}
          />

          <CustomCombobox
            options={questionOptions}
            control={control}
            name="selectedQuestion"
            query={searchQuestionsQuery}
            setQuery={setSearchQuestionsQuery}
            getLabel={(val) => val?.label || ""}
            by="value"
            label="Questions"
            placeholder="Select a Question"
            loading={loadingQuestion}
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

export default withAuth(ExamPassRateReport, HSHAdminOnly);
