import { SkillChecklistFragment, GetSkillChecklistsDetailsDocument } from "api";
import Button from "../../../../../components/Button";
import QueryCombobox from "../../../../../components/QueryCombobox";
import { SkillsChecklistReportLayout } from "../../../../../components/admin/reports/skill-checklist/SkillsChecklistReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { notify } from "../../../../../components/Notification";
import { useAgency } from "../../../../../hooks/useAgency";
import { directus } from "../../../../../utils/directus";
import z from "zod";
import { useState } from "react";

const schema = z.object({
  skills_checklists: z.array(z.any()),
});

type FormValues = z.infer<typeof schema>;

function SkillsChecklistsInsights() {
  const globalAgency = useAgency();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      skills_checklists: [],
    },
  });

  const publishedFilter = {
    status: {
      _eq: "published",
    },
  };

  const handleDownloadReportByType = async (type: "aggregate" | "specific") => {
    try {
      setLoading(true);
      const ids = form.getValues().skills_checklists.map((c) => c.id);
      const reportUrl = new URL(
        "/cms/competencies/reports/skills-checklist",
        window.location.origin
      );
      const link = document.createElement("a");

      switch (type) {
        case "aggregate":
          reportUrl.searchParams.append("type", "aggregate");
          if (globalAgency.currentAgency?.id) {
            reportUrl.searchParams.append(
              "agency",
              globalAgency.currentAgency.id
            );
          }

          link.download = "aggregate-skill-checklist-report.csv";
          break;

        case "specific":
          reportUrl.searchParams.append("type", "specific");
          reportUrl.searchParams.append("ids", ids.join(","));
          if (globalAgency.currentAgency?.id) {
            reportUrl.searchParams.append(
              "agency",
              globalAgency.currentAgency.id
            );
          }

          link.download = "item-level-for-specific-skill-checklists-report.csv";
          break;

        default:
          break;
      }

      await directus.auth.refreshIfExpired();
      const token = await directus.auth.token;

      const response = await fetch(reportUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (response.status !== 200) {
        const error = await response.json();
        return notify({
          type: "error",
          description: error.message,
        });
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notify({
        type: "error",
        description: "Failed to download report",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SkillsChecklistReportLayout>
      <div className="mb-4 flex flex-col justify-between gap-6">
        <h1 className="text-xl font-semibold">Content Insights</h1>
        <p>
          Content Insight reports provide a detailed view of skills checklist
          data, offering insights into engagement, progress, and checklist
          quality.
        </p>
        <ul className="list-disc space-y-2 px-4 text-sm sm:px-10">
          <li>
            The Aggregate Skills Checklist report tracks status trends over
            time, revealing clinician characteristics.
          </li>
          <li>
            The Item-Level Skills Checklist report offers granular skill and
            frequency analytics, aiding targeted training and highlighting
            performance strengths and challenges across clinician dimensions.
          </li>
        </ul>
        <QueryCombobox<SkillChecklistFragment>
          query={GetSkillChecklistsDetailsDocument}
          name="skills_checklists"
          label="Skills Checklists:"
          control={form.control}
          filter={publishedFilter}
          getLabel={(c) => c?.title || ""}
          dataKey="sc_definitions"
          placeholder="Select"
        />
        {globalAgency.currentAgency?.id && (
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="xs"
              label="Generate Aggregate Skills Checklist report"
              onClick={() => handleDownloadReportByType("aggregate")}
              disabled={loading}
            />
            <Button
              size="xs"
              disabled={loading || form.watch("skills_checklists").length <= 0}
              label="Generate Item Level for Specific Skills Checklists report"
              onClick={() => handleDownloadReportByType("specific")}
            />
          </div>
        )}
      </div>
    </SkillsChecklistReportLayout>
  );
}

export default withAuth(SkillsChecklistsInsights, AdminGroup);
