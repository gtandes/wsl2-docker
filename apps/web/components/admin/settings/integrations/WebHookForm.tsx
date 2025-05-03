import { z } from "zod";

import Button from "../../../Button";
import { Toggle } from "../../../Toggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useAgency } from "../../../../hooks/useAgency";
import { Input } from "../../../Input";
import { useUpdateAgencyMutation } from "api";
import { GENERIC_ERROR, notify } from "../../../Notification";
import { query } from "../../../../utils/utils";

const schema = z.object({
  webhook_enable: z.boolean(),
  webhook_url: z.string().url(),
  webhook_token: z.string().min(208, { message: "Webhook token is required" }),
  webhook_secret: z.string().min(40, { message: "Webhook secret is required" }),
});

type FormValues = z.infer<typeof schema>;

export const WebHookForm: React.FC = () => {
  const globalAgency = useAgency();
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenLoading, setTokenLoading] = useState<boolean>(false);
  const isAgencySelected = !!globalAgency.currentAgency?.id;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        webhook_enable: !!globalAgency.currentAgency?.webhook_enable,
        webhook_url: globalAgency.currentAgency?.webhook_url || "",
        webhook_token: globalAgency.currentAgency?.webhook_token || "",
        webhook_secret: globalAgency.currentAgency?.webhook_secret || "",
      }),
      [globalAgency]
    ),
  });

  const [updateAgency] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies"],
  });
  const isWebhookEnable = form.watch("webhook_enable");

  const generateToken = async (): Promise<void> => {
    setTokenLoading(true);
    const response = await query(
      `/cms/api/generate/token/${globalAgency.currentAgency?.id}`,
      "GET"
    );
    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }
    const data = await response.json();
    setTokenLoading(false);

    form.setValue("webhook_token", data.token);
    form.setValue("webhook_secret", data.secret);
  };

  const handleSubmit = async (values: FormValues) => {
    const { webhook_enable, webhook_url, webhook_token, webhook_secret } =
      values;
    setLoading(true);

    await updateAgency({
      variables: {
        id: globalAgency.currentAgency?.id!,
        data: {
          webhook_enable,
          webhook_url,
          webhook_token,
          webhook_secret,
        },
      },
    });

    notify({
      title: "Success",
      description: "Logos updated successfully",
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
            <h2 className="text-lg font-medium text-gray-900">Webhook</h2>
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
            name="webhook_enable"
            disabled={!isAgencySelected}
            control={form.control}
          />
          {isWebhookEnable && (
            <>
              <div className="flex flex-col gap-6">
                <Input
                  register={form.register("webhook_url")}
                  label="Webhook url"
                  required
                  error={form.formState.errors.webhook_url}
                />
              </div>
              <div className="flex flex-col gap-6">
                <Input
                  register={form.register("webhook_token")}
                  label="Webhook token"
                  required
                  readOnly={true}
                  error={form.formState.errors.webhook_token}
                />
              </div>
              <div className="flex flex-col gap-6">
                <Input
                  register={form.register("webhook_secret")}
                  label="Webhook secret"
                  required
                  readOnly={true}
                  error={form.formState.errors.webhook_secret}
                />
                <div>
                  <Button
                    label="Generate token"
                    onClick={generateToken}
                    loading={tokenLoading}
                    size="sm"
                    type="button"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
};
