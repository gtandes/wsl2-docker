import { zodResolver } from "@hookform/resolvers/zod";
import { ExamFragment, GetAllExamsForAssignCompetencyDocument } from "api";
import { useForm } from "react-hook-form";
import { useState } from "react";
import z from "zod";

import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { notify } from "../../../../../components/Notification";
import QueryCombobox from "../../../../../components/QueryCombobox";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { ExamReportLayout } from "../../../../../components/admin/reports/exams/ExamReportLayout";
import { useAgency } from "../../../../../hooks/useAgency";
import { query } from "../../../../../utils/utils";

const schema = z.object({
  exams: z.array(z.any()).max(3, "You can select up to 3 exams"),
});

type FormValues = z.infer<typeof schema>;

function ExamsContentInsights() {
  const [loading, setLoading] = useState(false);
  const { currentAgency } = useAgency();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { exams: [] },
  });

  const buildReportUrl = (
    type: "aggregate" | "specific",
    examIds: string[]
  ) => {
    const reportUrl = new URL(
      "/cms/competencies/reports/exam",
      window.location.origin
    );

    reportUrl.searchParams.append("type", type);
    if (currentAgency?.id) {
      reportUrl.searchParams.append("agency", currentAgency.id);
    }
    reportUrl.searchParams.append("ids", examIds.join(","));

    return reportUrl.toString();
  };

  const handleDownloadReport = async (type: "aggregate" | "specific") => {
    try {
      setLoading(true);
      const examIds = form.getValues().exams.map((exam) => exam.id);
      const reportUrl = buildReportUrl(type, examIds);
      const fileName =
        type === "specific"
          ? "item-level-for-specific-exams-report.csv"
          : "aggregate-exam-report.csv";

      let response = await query(reportUrl, "GET");

      if (response.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        response = await query(reportUrl, "GET");
      }

      if (response.status !== 200) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notify({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download report. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const examCount = form.watch("exams").length;
  const isDisabled = loading || examCount === 0;

  return (
    <ReportLayout>
      <ExamReportLayout>
        <div className="mb-4 flex flex-col gap-6">
          <header className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold">Content Insights</h1>
            <FilterComboInfoTooltip />
          </header>
          <p>
            Content Insight reports provide a detailed view of assessment data,
            offering insights into engagement, progress, and exam quality.
          </p>
          <ul className="list-disc space-y-2 px-4 text-sm sm:px-10">
            <li>
              The Aggregate Exam report tracks status trends over time,
              revealing clinician characteristics.
            </li>
            <li>
              The Item-Level Exam report offers granular question-level
              analytics, identifying issues with specific questions within an
              exam, which aids in crafting fair yet challenging assessments that
              accurately measure clinician expertise. It also can help target
              additional training opportunities and highlight performance
              strengths and challenges across clinician dimensions.
            </li>
          </ul>

          <QueryCombobox<ExamFragment>
            query={GetAllExamsForAssignCompetencyDocument}
            name="exams"
            label="Exams: (select a maximum of 3)"
            control={form.control}
            filter={{ status: { _eq: "published" } }}
            getLabel={(exam) => exam.title || ""}
            dataKey="exams"
            placeholder="Filter by name"
            disabled={examCount > 2}
          />

          {currentAgency?.id && (
            <div className="flex items-center gap-4">
              <Button
                size="xs"
                label="Generate Aggregate Exam report"
                onClick={() => handleDownloadReport("aggregate")}
                disabled={isDisabled}
              />
              <Button
                size="xs"
                label="Generate Item Level for Specific Exams report"
                onClick={() => handleDownloadReport("specific")}
                disabled={isDisabled}
              />
            </div>
          )}
        </div>
      </ExamReportLayout>
    </ReportLayout>
  );
}

export default ExamsContentInsights;
