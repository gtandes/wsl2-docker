import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "../../types/roles";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { CloseModalHandler } from "../../hooks/useModal";
import Competencies from "./Competencies";
import Button from "../Button";
import { Agency } from "../../types/global";
import { Directus_Users } from "api";
import { GENERIC_ERROR, notify } from "../Notification";
import { first } from "lodash";
import { editAssignmentDetailsValidation } from "../../utils/validations";
import { query } from "../../utils/utils";

type CompetencyItem = {
  directus_users?: any;
  [key: string]: any;
};

const schema = z
  .object({
    users_by: z.object({
      users: z.array(z.any()),
    }),
    competencies: z
      .object({
        exams: z.array(z.any()),
        modules: z.array(z.any()),
        skills_checklists: z.array(z.any()),
        policies: z.array(z.any()),
        documents: z.array(z.any()),
        bundles: z.array(z.any()),
      })
      .partial()
      .refine(
        (val) => {
          for (const comp of Object.values(val)) {
            if (comp.length) return true;
          }
          return false;
        },
        { message: "At least one competency is required." }
      ),
    edit_assignments: z.boolean(),
    details: z.object({
      due_date: z.string().optional(),
      allowed_attempts: z.string().optional(),
      expiration: z.string().optional(),
    }),
  })
  .superRefine(editAssignmentDetailsValidation);

type FormSingleUserCompetenciesValues = z.infer<typeof schema>;
interface Props {
  users: Directus_Users[];
  refreshUserAssignments: () => void;
  onClose: CloseModalHandler;
  excludedIds?: {
    modules: string[];
    exams: string[];
    policies: string[];
    skillChecklists: string[];
    documents: string[];
  };
}

export default function AssignSingleUserCompentenciesModal({
  users,
  refreshUserAssignments,
  onClose,
  excludedIds,
}: Props) {
  const auth = useAuth();
  const globalAgency = useAgency();
  const [loading, setLoading] = useState<boolean>(false);
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const agency = isAgencyUser
    ? (first(auth.currentUser?.agencies) as Agency)
    : globalAgency.currentAgency;
  const form = useForm<FormSingleUserCompetenciesValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        users_by: {
          users,
        },
        competencies: {
          exams: [],
          modules: [],
          skills_checklists: [],
          policies: [],
          documents: [],
          bundles: [],
        },
        edit_assignments: false,
        details: {
          due_date: "",
          allowed_attempts: "",
          expiration: "",
        },
      }),
      [users]
    ),
  });

  const onSubmit = async (values: FormSingleUserCompetenciesValues) => {
    const users_by = values.users_by;
    const removeDirectusUsers = (
      array: CompetencyItem[] | undefined
    ): CompetencyItem[] => {
      if (Array.isArray(array)) {
        return array.map(({ directus_users, ...rest }) => rest);
      }
      return [];
    };

    const updatedExams = removeDirectusUsers(values?.competencies?.exams);
    const updatedModules = removeDirectusUsers(values?.competencies?.modules);
    const updatedDocuments = removeDirectusUsers(
      values?.competencies?.documents
    );
    const updatedPolicies = removeDirectusUsers(values?.competencies?.policies);
    const updatedSkillsChecklists = removeDirectusUsers(
      values?.competencies?.skills_checklists
    );

    if (values.competencies) {
      values.competencies.exams = updatedExams;
      values.competencies.modules = updatedModules;
      values.competencies.documents = updatedDocuments;
      values.competencies.policies = updatedPolicies;
      values.competencies.skills_checklists = updatedSkillsChecklists;
    }

    if (!values.edit_assignments) {
      values.details.due_date = "";
      values.details.allowed_attempts = "";
      values.details.expiration = "";
    }

    const competencies = values.competencies;
    const details = values.details;
    setLoading(true);
    const response = await query(`/cms/assignments/competencies`, "POST", {
      users_by,
      competencies,
      details,
      agency: agency?.id,
    });

    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }

    notify({
      title: "Success!",
      description: "Competencies assigned successfully.",
      type: "success",
    });
    refreshUserAssignments();
    setLoading(false);
    onClose();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <Competencies
        formContext={form}
        agency={agency}
        excludedIds={excludedIds}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          label="Cancel"
        />
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          label="Assign"
          loading={loading}
        />
      </div>
    </div>
  );
}
