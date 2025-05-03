import { FieldValues } from "react-hook-form";
import { Input } from "../Input";
import DateInputControlled from "../DateInputControlled";
import { Switch } from "@headlessui/react";
import { useState } from "react";
import { ExpirationType } from "types";

interface Props<T extends FieldValues> {
  formContext: T;
  handleClose?: () => void;
  expiration?: ExpirationType;
  disableAllowAttempts?: boolean;
}

export default function EditAssignmentDetails<T extends FieldValues>({
  formContext,
  handleClose,
  expiration = ExpirationType.ONE_TIME,
  disableAllowAttempts = false,
}: Props<T>) {
  const [expirationValue, setExpirationValue] =
    useState<ExpirationType>(expiration);

  const isEnable = (value: ExpirationType): boolean =>
    value === expirationValue;

  const handleExpirationValue = (value: ExpirationType) => {
    setExpirationValue(value);
    formContext.setValue("details.expiration", value);
  };

  return (
    <div className="rounded-md bg-blue-100 p-10">
      <div className="flex justify-between">
        {handleClose && (
          <>
            <p className="mb-5 text-sm font-medium text-blue-800">
              Edit Assignment Details for all Competencies
            </p>
            <span
              className="cursor-pointer text-base text-blue-800"
              onClick={handleClose}
            >
              x
            </span>
          </>
        )}
      </div>
      <div className="flex flex-col items-center gap-5 md:flex-row">
        <div className="relative w-full md:w-48">
          <DateInputControlled
            register={formContext.control.register("details.due_date")}
            label="Due Date"
            min={new Date().toISOString().split("T")[0]}
            error={formContext.formState.errors?.details?.due_date}
          />
        </div>
        <div className="relative w-full md:w-48">
          <Input
            register={formContext.control.register("details.allowed_attempts")}
            label="Allowed Attempts"
            type="number"
            disabled={disableAllowAttempts}
            error={formContext.formState.errors?.details?.allowed_attempts}
          />
        </div>
        <div className="relative mt-5">
          <Switch.Group>
            <div className="flex flex-wrap items-center justify-start gap-3">
              <Switch
                checked={isEnable(ExpirationType.ONE_TIME)}
                onChange={() => handleExpirationValue(ExpirationType.ONE_TIME)}
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
                onChange={() => handleExpirationValue(ExpirationType.YEARLY)}
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
                onChange={() => handleExpirationValue(ExpirationType.BIANNUAL)}
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
          {formContext.formState.errors?.details?.expiration && (
            <p className="absolute mt-2 text-xs text-red-500">
              {formContext.formState.errors?.details?.expiration?.message?.toString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
