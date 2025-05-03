import { z } from "zod";
import { editAssignmentDetailsValidation } from "../../utils/validations";
import { Competencies } from "../../types/global";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpirationType, CompetencyType } from "types";
import EditAssignmentDetails from "./EditAssignmentDetails";
import Button from "../Button";
import { query } from "../../utils/utils";
import { GENERIC_ERROR, notify } from "../Notification";

interface Props {
  assignment: Competencies;
  refreshUserAssignments: () => void;
  onClose: () => void;
}

const schema = z
  .object({
    edit_assignments: z.boolean(),
    details: z.object({
      due_date: z.string().optional(),
      allowed_attempts: z.string().optional(),
      expiration: z.string().optional(),
    }),
  })
  .superRefine(editAssignmentDetailsValidation);

type FormReassignUserCompetenciesValues = z.infer<typeof schema>;

export const ReassignCompetency = ({
  assignment,
  refreshUserAssignments,
  onClose,
}: Props) => {
  const [loading, setLoading] = useState<boolean>(false);

  const expiration = useMemo(() => {
    let expiration = ExpirationType.ONE_TIME;
    if (assignment?.expiration_type) {
      expiration = assignment.expiration_type as ExpirationType;
    }
    return expiration;
  }, [assignment]);

  const form = useForm<FormReassignUserCompetenciesValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        edit_assignments: true,
        details: {
          due_date: "",
          allowed_attempts: String(assignment.allowed_attempts),
          expiration,
        },
      }),
      [assignment]
    ),
  });

  const onSubmit = async (values: FormReassignUserCompetenciesValues) => {
    setLoading(true);
    const response = await query(`/cms/assignments/reassign`, "POST", {
      competency_id: assignment.id,
      type: assignment.type,
      details: values.details,
    });
    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }

    notify({
      title: "Success!",
      description: "Competency reassigned successfully.",
      type: "success",
    });
    refreshUserAssignments();
    onClose();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <EditAssignmentDetails
        formContext={form}
        expiration={expiration}
        disableAllowAttempts={
          assignment.type !== CompetencyType.EXAM &&
          assignment.type !== CompetencyType.MODULE
        }
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
          label="Reassign"
          loading={loading}
        />
      </div>
    </div>
  );
};
