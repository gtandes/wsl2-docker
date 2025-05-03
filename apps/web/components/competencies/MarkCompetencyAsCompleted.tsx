import { CompetencyType, ExpirationType } from "types";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Competencies } from "../../types/global";
import Button from "../Button";
import { query } from "../../utils/utils";
import { GENERIC_ERROR, notify } from "../Notification";
import { Input } from "../Input";
import DateInputControlled from "../DateInputControlled";
import { Switch } from "@headlessui/react";

interface Props {
  assignment: Competencies;
  type: CompetencyType;
  refreshUserAssignments: () => void;
  onClose: () => void;
}

const schema = z.object({
  finished_on: z.string().min(1, "Finished on is required"),
  expiration: z.string().optional(),
});

type FormMarkCompetencyAsCompltedValues = z.infer<typeof schema>;

export default function MarkCompetencyAsCompleted({
  assignment,
  type,
  refreshUserAssignments,
  onClose,
}: Props) {
  const [loading, setLoading] = useState<boolean>(false);

  const isEnable = (value: ExpirationType): boolean =>
    value === expirationValue;

  const expiration = useMemo(() => {
    let expiration = ExpirationType.ONE_TIME;
    if (assignment?.expiration_type) {
      expiration = assignment.expiration_type as ExpirationType;
    }
    return expiration;
  }, [assignment]);

  const [expirationValue, setExpirationValue] =
    useState<ExpirationType>(expiration);

  const form = useForm<FormMarkCompetencyAsCompltedValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        finished_on: assignment.assigned_on?.toISOString() || "",
        expiration,
      }),
      [assignment, expiration]
    ),
  });

  const handleExpirationValue = (value: ExpirationType) => {
    setExpirationValue(value);
    form.setValue("expiration", value);
  };

  const onSubmit = async (values: FormMarkCompetencyAsCompltedValues) => {
    setLoading(true);
    const finishedOn = new Date(values.finished_on);
    const response = await query(
      `/cms/assignments/mark-as-completed`,
      "PATCH",
      {
        assignment,
        type,
        finished_on: finishedOn,
        expiration: values.expiration,
      }
    );
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
    <>
      <div className="mb-5 rounded-md bg-blue-100 p-10">
        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-col items-center justify-center gap-5 md:flex-row">
            <div className="relative w-full md:w-48">
              <DateInputControlled
                register={form.control.register("finished_on")}
                label="Finished On"
                error={form.formState.errors?.finished_on}
              />
            </div>
            <div className="relative mt-5">
              <Switch.Group>
                <div className="flex flex-wrap items-center justify-start gap-3">
                  <Switch
                    checked={isEnable(ExpirationType.ONE_TIME)}
                    onChange={() =>
                      handleExpirationValue(ExpirationType.ONE_TIME)
                    }
                    className={`${
                      isEnable(ExpirationType.ONE_TIME)
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    } focus:ring-indigo-500 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        isEnable(ExpirationType.ONE_TIME)
                          ? "translate-x-6"
                          : "translate-x-1"
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="mb-1 block text-xs text-gray-700">
                    No expiration
                  </Switch.Label>
                  <Switch
                    checked={isEnable(ExpirationType.YEARLY)}
                    onChange={() =>
                      handleExpirationValue(ExpirationType.YEARLY)
                    }
                    className={`${
                      isEnable(ExpirationType.YEARLY)
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    } focus:ring-indigo-500 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        isEnable(ExpirationType.YEARLY)
                          ? "translate-x-6"
                          : "translate-x-1"
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="mb-1 block text-xs text-gray-700">
                    Annual
                  </Switch.Label>
                  <Switch
                    checked={isEnable(ExpirationType.BIANNUAL)}
                    onChange={() =>
                      handleExpirationValue(ExpirationType.BIANNUAL)
                    }
                    className={`${
                      isEnable(ExpirationType.BIANNUAL)
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    } focus:ring-indigo-500 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        isEnable(ExpirationType.BIANNUAL)
                          ? "translate-x-6"
                          : "translate-x-1"
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="mb-1 block text-xs text-gray-700">
                    Biannual
                  </Switch.Label>
                </div>
              </Switch.Group>
              {form.formState.errors?.expiration && (
                <p className="absolute mt-2 text-xs text-red-500">
                  {form.formState.errors?.expiration?.message?.toString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
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
          label="Mark as completed"
          loading={loading}
        />
      </div>
    </>
  );
}
