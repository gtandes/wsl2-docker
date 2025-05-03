import { useForm } from "react-hook-form";
import Button from "../Button";
import { Input } from "../Input";
import { Toggle } from "../Toggle";
import { CompetenciesExamFragment, useUpdateExamCompetencyMutation } from "api";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { GENERIC_SUCCESS_SAVED, notify } from "../Notification";
import { formatDateForInput } from "../../utils/format";
import { CompetencyState } from "types";

interface Props {
  onClose: () => void;
  assignment: CompetenciesExamFragment;
}

const schema = z.object({
  assigned_on: z.string().nonempty({ message: "Assigned on is required" }),
  due_date: z.string().nonempty({ message: "Due date is required" }),
  cert_expiry_date: z
    .string()
    .nonempty({ message: "Cert. Expiry Date is required" }),
  cert_code: z.string(),
  allowed_attempts: z
    .number({
      required_error: "Allowed Attempts is required",
      invalid_type_error: "Allowed Attempts must be a number",
    })
    .min(1, "Minimum value is 1")
    .max(100, "Maximum value is 100"),
  annual: z.boolean(),
});

type FormType = z.infer<typeof schema>;

export const EditAssignmentModal: React.FC<Props> = ({
  onClose,
  assignment,
}) => {
  const form = useForm<FormType>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const [updateExamCompetency, updateExamCompetencyResult] =
    useUpdateExamCompetencyMutation({
      refetchQueries: ["UserCompetenciesTotalPages", "UserCompetencies"],
    });

  const onSubmit = async (data: FormType) => {
    let status = assignment.status;
    if (
      data.allowed_attempts - Number(assignment.attempts_used) > 0 &&
      status === CompetencyState.FAILED
    ) {
      status = CompetencyState.IN_PROGRESS;
    }

    const variables = {
      id: assignment.id,
      data: {
        assigned_on: data.assigned_on
          ? new Date(data.assigned_on + "T00:00")
          : undefined,
        due_date: data.due_date ? new Date(data.due_date + "T00:00") : null,
        cert_expiry_date: data.cert_expiry_date
          ? new Date(data.cert_expiry_date + "T00:00")
          : null,
        cert_code: data.cert_code,
        allowed_attempts: data.allowed_attempts,
        exam_versions_id: {
          id: assignment.exam_versions_id?.id,
          expiration: data.annual ? "yearly" : "one-time",
        },
        status,
      },
    };

    await updateExamCompetency({
      variables,
    });

    notify(GENERIC_SUCCESS_SAVED);
    onClose();
  };

  useEffect(() => {
    if (assignment) {
      assignment.assigned_on &&
        form.setValue(
          "assigned_on",
          formatDateForInput(assignment.assigned_on)
        );
      assignment.due_date &&
        form.setValue("due_date", formatDateForInput(assignment.due_date));
      assignment.cert_expiry_date &&
        form.setValue(
          "cert_expiry_date",
          formatDateForInput(assignment.cert_expiry_date)
        );
      form.setValue("cert_code", assignment.cert_code || String(Date.now()));
      assignment.allowed_attempts &&
        form.setValue("allowed_attempts", assignment.allowed_attempts);
      form.setValue(
        "annual",
        assignment.exam_versions_id?.expiration === "yearly"
      );
    }
  }, [assignment, form]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-2 xl:gap-8"
    >
      <div className="flex flex-col flex-wrap gap-2 lg:flex-row lg:gap-5">
        <Input
          register={form.register("assigned_on")}
          required
          label="Assigned on"
          type="date"
          error={form.formState.errors.assigned_on}
          classes="flex-1"
        />
        <Input
          register={form.register("due_date")}
          required
          label="Due date"
          type="date"
          error={form.formState.errors.due_date}
          classes="flex-1"
        />
        <Input
          register={form.register("cert_expiry_date")}
          error={form.formState.errors.cert_expiry_date}
          label="Cert. Expiry Date"
          type="date"
          classes="flex-1"
        />
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-5">
        <div className="flex w-full flex-col items-end">
          <Input
            register={form.register("cert_code")}
            label="Certification Code"
            error={form.formState.errors.cert_code}
          />
          <button
            type="button"
            onClick={() => {
              form.setValue("cert_code", String(Date.now()));
            }}
            className="text-end text-sm text-dark-blue-500 underline"
          >
            Create Random Code
          </button>
        </div>
        <Input
          register={form.register("allowed_attempts", {
            valueAsNumber: true,
          })}
          label="Allowed Attempts"
          required
          error={form.formState.errors.allowed_attempts}
        />
      </div>
      <div className="flex flex-col justify-between gap-3 lg:flex-row">
        <Toggle name="annual" label="Annual" control={form.control} />
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" label="Cancel" />
          <Button
            type="submit"
            label="Apply changes"
            loading={updateExamCompetencyResult.loading}
          />
        </div>
      </div>
    </form>
  );
};
