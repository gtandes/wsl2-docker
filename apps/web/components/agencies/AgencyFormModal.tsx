import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "../Input";
import Button from "../Button";
import {
  AgencyForAdminFragment,
  useCreateAgencyMutation,
  useUpdateAgencyMutation,
} from "api";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notify,
  GENERIC_SUCCESS_SAVED,
  GENERIC_SUCCESS_CREATED,
} from "../Notification";

type Props = {
  onClose: () => void;
  agency?: AgencyForAdminFragment;
  usedAgencyNames: string[];
};

export const AgencyFormModal: React.FC<Props> = ({
  onClose,
  agency,
  usedAgencyNames,
}) => {
  type AgencyFormValues = z.infer<typeof AgencyFormSchema>;

  const lowerCaseUsedAgencyNames = usedAgencyNames.map((a) => a.toLowerCase());

  const AgencyFormSchema = z.object({
    name: z
      .string()
      .nonempty("Name is required")
      .refine(
        (value) => !lowerCaseUsedAgencyNames.includes(value.toLowerCase()),
        "Name already exists"
      ),
  });

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(AgencyFormSchema),
  });

  const [createAgency] = useCreateAgencyMutation({
    refetchQueries: ["getAllAgencies", "getAllAgenciesForAdmin"],
  });

  const [updateAgency] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies", "getAllAgenciesForAdmin"],
  });

  const onSubmit = async (values: AgencyFormValues) => {
    if (agency) {
      await updateAgency({
        variables: {
          id: agency.id,
          data: {
            name: values.name,
          },
        },
      });

      notify(GENERIC_SUCCESS_SAVED);
    } else {
      await createAgency({
        variables: {
          data: {
            name: values.name,
            status: "published",
          },
        },
      });

      notify(GENERIC_SUCCESS_CREATED);
    }

    onClose();
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <Input
        error={form.formState.errors.name}
        register={form.register("name")}
        label="Name"
      />
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} label="Cancel" variant="outline" />
        <Button type="submit" label={!agency ? "Save" : "Edit"} />
      </div>
    </form>
  );
};
