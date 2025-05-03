import React, { useEffect } from "react";
import Button from "./Button";
import { Input } from "./Input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { query } from "../utils/utils";
import { COPIED, notify } from "./Notification";

interface CustomTabProps {
  agency_id?: string;
  tabUrl?: string;
  iframeToken?: string;
  ats_type?: string;
  isDisabled?: boolean;
}

const schema = z.object({
  tab_url: z.string().optional(),
  iframe_token: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export const CustomTab: React.FC<CustomTabProps> = ({
  agency_id,
  ats_type,
  tabUrl = `${window.origin}/admin/${ats_type}/iframe`,
  isDisabled,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tab_url: tabUrl,
      iframe_token: "",
    },
  });

  const generateIframeToken = async (length = 32) => {
    const newToken = [...Array(length)]
      .map(() => Math.random().toString(36).charAt(2))
      .join("");

    form.setValue("iframe_token", newToken);

    if (!agency_id) {
      console.error("Agency ID is missing.");
      return;
    }

    try {
      const response = await query(
        "/cms/integration/custom-tab/token",
        "POST",
        { agency_id, iframe_token: newToken, ats_type }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save token");
      }
    } catch (error) {
      console.error("Error saving token:", error);
    }
  };

  useEffect(() => {
    const handleFetch = async () => {
      if (!agency_id) {
        console.error("Agency ID is missing.");
        return;
      }

      try {
        const queryParams = new URLSearchParams({
          agency_id,
          ...(ats_type ? { ats_type } : {}),
        }).toString();

        const response = await query(
          `/cms/integration/custom-tab/fetch?${queryParams}`,
          "GET"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch data");
        }
        if (Array.isArray(data) && data.length > 0 && data[0]?.token) {
          form.setValue("iframe_token", data[0].token);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    handleFetch();
  }, [agency_id, ats_type, form]);

  const copyToClipboard = () => {
    const iframeToken = form.getValues("iframe_token");

    if (!iframeToken) {
      console.error("No token available to copy.");
      return;
    }

    const textToCopy = `${window.origin}/admin/${ats_type}/iframe?token=${iframeToken}`;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        notify(COPIED);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  return (
    <>
      <div className="mb-3 flex items-center">
        <h3 className="md:text-2xs mr-3 md:font-semibold">Custom Tab</h3>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-1">
        <Input
          disabled={true}
          register={form.register("tab_url")}
          label="Custom Tab URL"
          placeholder="Custom Tab URL"
        />

        <Input
          disabled={true}
          register={form.register("iframe_token")}
          label="Custom Tab Token"
          placeholder="Custom Tab Token"
        />
      </div>

      <div className="mt-3 flex gap-4">
        <Button
          disabled={isDisabled}
          label="Generate Token"
          size="sm"
          type="button"
          onClick={() => generateIframeToken()}
        />

        <Button
          disabled={isDisabled}
          label="Copy"
          size="sm"
          type="button"
          onClick={() => copyToClipboard()}
        />
      </div>
    </>
  );
};
