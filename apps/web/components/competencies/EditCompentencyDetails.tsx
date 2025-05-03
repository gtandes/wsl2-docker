import { ExpirationType, CompetencyType } from "types";
import EditAssignmentDetails from "./EditAssignmentDetails";
import { z } from "zod";
import { editAssignmentDetailsValidation } from "../../utils/validations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Competencies } from "../../types/global";
import Button from "../Button";
import { query } from "../../utils/utils";
import { GENERIC_ERROR, notify } from "../Notification";
import { format, parseISO } from "date-fns";

interface Props {
  assignment: Competencies;
  type: CompetencyType;
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

type FormSingleUserCompetenciesDetailsValues = z.infer<typeof schema>;

export default function EditCompentencyDetails({
  assignment,
  type,
  refreshUserAssignments,
  onClose,
}: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const expiration = useMemo(() => {
    let expiration = ExpirationType.ONE_TIME;
    if (assignment?.expiration_type) {
      expiration = assignment.expiration_type as ExpirationType;
    }
    return expiration;
  }, [assignment]);

  const dateParse = assignment.due_date
    ? parseISO(assignment.due_date.toISOString())
    : null;

  const form = useForm<FormSingleUserCompetenciesDetailsValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        edit_assignments: true,
        details: {
          due_date: dateParse ? format(dateParse, "yyyy-MM-dd") : "",
          allowed_attempts: String(assignment.allowed_attempts),
          expiration,
        },
      }),
      [assignment.allowed_attempts, expiration, dateParse]
    ),
  });

  const onSubmit = async (values: FormSingleUserCompetenciesDetailsValues) => {
    setLoading(true);
    const response = await query(`/cms/assignments/competency`, "PATCH", {
      competency_id: assignment.id,
      type,
      details: values.details,
    });
    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }

    notify({
      title: "Success!",
      description: "Competency updated successfully.",
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
          type !== CompetencyType.EXAM && type !== CompetencyType.MODULE
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
          label="Edit"
          loading={loading}
        />
      </div>
    </div>
  );
}
