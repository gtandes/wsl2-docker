import { z } from "zod";

import Button from "../../../Button";
import { Toggle } from "../../../Toggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useAgency } from "../../../../hooks/useAgency";
import { Input } from "../../../Input";
import { useUpdateAgencyMutation } from "api";
import { notify } from "../../../Notification";

const createSchema = (isEnabled: boolean) => {
  return z.object({
    ia_enable: z.boolean(),
    ia_app_id: isEnabled
      ? z.string().nonempty({ message: "App ID is required" })
      : z.string().optional(),
    ia_api_key: isEnabled
      ? z.string().nonempty({ message: "API Key is required" })
      : z.string().optional(),
  });
};

const IntegrityAdvocateForm: React.FC = () => {
  const globalAgency = useAgency();
  const [loading, setLoading] = useState<boolean>(false);
  const isAgencySelected = !!globalAgency.currentAgency?.id;

  const [isIaEnabled, setIsIaEnabled] = useState(
    !!globalAgency.currentAgency?.ia_enable
  );

  const form = useForm<z.infer<ReturnType<typeof createSchema>>>({
    resolver: zodResolver(createSchema(isIaEnabled)),
    values: useMemo(
      () => ({
        ia_enable: !!globalAgency.currentAgency?.ia_enable,
        ia_app_id: globalAgency.currentAgency?.ia_app_id || "",
        ia_api_key: globalAgency.currentAgency?.ia_api_key || "",
      }),
      [globalAgency]
    ),
  });

  const [updateAgency] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies"],
  });

  const watchedIaEnable = form.watch("ia_enable");

  useEffect(() => {
    setIsIaEnabled(watchedIaEnable);
    form.clearErrors();
  }, [watchedIaEnable, form]);

  const handleSubmit = async (
    values: z.infer<ReturnType<typeof createSchema>>
  ) => {
    const { ia_enable } = values;
    setLoading(true);

    const ia_app_id = ia_enable ? values.ia_app_id : "";
    const ia_api_key = ia_enable ? values.ia_api_key : "";

    await updateAgency({
      variables: {
        id: globalAgency.currentAgency?.id!,
        data: {
          ia_api_key,
          ia_app_id,
          ia_enable,
        },
      },
    });

    notify({
      title: "Success",
      description: "Proctoring settings updated successfully",
      type: "success",
    });
    setLoading(false);
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-5 rounded-lg bg-white px-10 py-8"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row">
          <div className="flex flex-col text-center sm:text-start">
            <h2 className="text-lg font-medium text-gray-900">Proctoring</h2>
          </div>
          {isAgencySelected && (
            <Button
              label="Save Changes"
              loading={loading}
              size="sm"
              type="submit"
            />
          )}
        </div>
        <div className="flex flex-col gap-5">
          <Toggle
            label="Enable/disable"
            name="ia_enable"
            disabled={!isAgencySelected}
            control={form.control}
          />
          {watchedIaEnable && (
            <>
              <div className="flex flex-col gap-6">
                <Input
                  register={form.register("ia_app_id")}
                  label="Integrity Advocate App ID"
                  required
                  error={form.formState.errors.ia_app_id}
                />
              </div>
              <div className="flex flex-col gap-6">
                <Input
                  register={form.register("ia_api_key")}
                  label="Integrity Advocate API Key"
                  required
                  error={form.formState.errors.ia_api_key}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
};

export default IntegrityAdvocateForm;
