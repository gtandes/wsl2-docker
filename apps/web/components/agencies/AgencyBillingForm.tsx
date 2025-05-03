import React, { useCallback, useEffect, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { useGetAllAgenciesForBillingQuery } from "api";
import Button from "../Button";
import { Combobox } from "../Combobox";
import { useForm } from "react-hook-form";
import { directus } from "../../utils/directus";
import { notify } from "../Notification";
import { zodResolver } from "@hookform/resolvers/zod";
import zod from "zod";

const DEBOUNCE_TIME = 500;
const PAGE_SIZE = 5;

const schema = zod.object({
  agency: zod.object({
    id: zod.string(),
    name: zod.string(),
  }),
});
type FormValues = zod.infer<typeof schema>;

const downloadReport = async (id: string, name: string) => {
  const retryTimes = 3;
  const retryDelay = 2000;
  for (let attempt = 1; attempt <= retryTimes; attempt++) {
    try {
      const reportUrl = new URL(
        `/cms/agencies/billing-report/${id}`,
        window.location.origin
      );

      await directus.auth.refreshIfExpired();
      const token = await directus.auth.token;

      const response = await fetch(reportUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 503 && attempt < retryTimes) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        const error = await response.json();
        return notify({ type: "error", description: error.message });
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `agency-${name}-report-billing.csv`.toLowerCase();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      break;
    } catch (error) {
      if (attempt >= retryTimes) {
        notify({ type: "error", description: "Failed to download report" });
      }
    }
  }
};

export const AgencyBillingForm: React.FC = () => {
  const [agencySearch, setAgencySearch] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const debouncedSearchAgencyQuery = useDebounce(agencySearch, DEBOUNCE_TIME);

  const { data: agencyData, error: agencyDataError } =
    useGetAllAgenciesForBillingQuery({
      variables: {
        limit: PAGE_SIZE,
        offset,
        search: debouncedSearchAgencyQuery,
      },
    });

  useEffect(() => {
    setOffset(0);
  }, [agencySearch]);

  const handleDownloadReport = async (values: FormValues) => {
    setLoading(true);
    const { id, name } = values.agency;
    await downloadReport(id, name);
    setLoading(false);
  };

  if (agencyDataError) {
    notify({ type: "error", description: "Failed to fetch agencies" });
  }

  return (
    <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
      <form
        onSubmit={form.handleSubmit(handleDownloadReport)}
        className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-center"
      >
        <Combobox
          options={agencyData?.agencies || []}
          control={form.control}
          name="agency"
          query={agencySearch}
          setQuery={setAgencySearch}
          getLabel={(val) => val?.name || ""}
          by="id"
          label="Billing report"
          placeholder="Filter by Agency"
          required
        />
        <Button type="submit" label="Generate report" disabled={loading} />
      </form>
    </div>
  );
};
