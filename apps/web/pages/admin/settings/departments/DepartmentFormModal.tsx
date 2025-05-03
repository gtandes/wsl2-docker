import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import Select, { SelectOption } from "../../../../components/Select";
import { Input } from "../../../../components/Input";
import Button from "../../../../components/Button";

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notify,
  GENERIC_SUCCESS_SAVED,
  GENERIC_SUCCESS_CREATED,
} from "../../../../components/Notification";
import {
  Departments,
  useCreateDepartmentMutation,
  useGetAllAgenciesQuery,
  useUpdateDepartmentMutation,
} from "api";
import { useAuth } from "../../../../hooks/useAuth";
import { UserRole } from "../../../../types/roles";
import { UUID } from "crypto";
import { useAgency } from "../../../../hooks/useAgency";
import { Agency } from "../../../../types/global";

const DepartmentFormSchema = z.object({
  name: z.string().nonempty("Name is required."),
  agency: z.string().nonempty("Agency is required."),
});

type DepartmentFormValues = z.infer<typeof DepartmentFormSchema>;

type Props = {
  agency: Agency;
  department?: Departments;
  onClose: () => void;
};

export const DepartmentFormModal: React.FC<Props> = ({
  agency,
  department,
  onClose,
  ...props
}) => {
  const auth = useAuth();
  const globalAgency = useAgency();
  const isAdmin = auth.currentUser?.role === UserRole.HSHAdmin;
  const agencyWasSelected = globalAgency.currentAgency?.id !== undefined;
  const isNew = !department;
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
  });

  const [createDepartment] = useCreateDepartmentMutation({
    refetchQueries: ["GetAllDepartmentsForListing"],
  });

  const [updateDepartment] = useUpdateDepartmentMutation({
    refetchQueries: ["GetAllDepartmentsForListing"],
  });

  const { data: agenciesData, loading: loadingAgencies } =
    useGetAllAgenciesQuery({
      variables: {
        filter: { status: { _eq: "published" } },
        sort: ["name"],
      },
    });

  const agencyOptions: SelectOption[] = agenciesData?.agencies
    ? [
        {
          label: "Select an agency",
          value: "",
          selected: !form.watch("agency"),
        },
        ...agenciesData?.agencies.map((item) => ({
          label: item.name!,
          value: item.id,
          selected: item.id === form.watch("agency"),
        })),
      ]
    : [];

  const onSubmit = async (values: DepartmentFormValues) => {
    if (isNew) {
      await createDepartment({
        variables: {
          data: {
            name: values.name,
            agency: { id: values.agency as UUID },
            status: "published",
          },
        },
      });
      notify(GENERIC_SUCCESS_CREATED);
    } else {
      await updateDepartment({
        variables: {
          id: department.id,
          data: {
            name: values.name,
            agency: { id: values.agency as UUID },
          },
        },
      });
      notify(GENERIC_SUCCESS_SAVED);
    }

    onClose();
  };

  useEffect(() => {
    if (!isNew) {
      form.setValue("name", department.name || "");
      form.setValue("agency", department.agency?.id || "");
    } else if (globalAgency.currentAgency?.id) {
      form.setValue("agency", globalAgency.currentAgency.id);
    }
  }, [form, department, isNew, globalAgency.currentAgency?.id]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      {isAdmin && !loadingAgencies && (
        <Select
          label="Agency"
          register={form.register("agency")}
          options={agencyOptions}
          error={form.formState.errors.agency}
          disabled={!isAdmin || (isAdmin && agencyWasSelected)}
        />
      )}
      <Input
        error={form.formState.errors.name}
        register={form.register("name")}
        label="Name"
      />
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} label="Cancel" variant="outline" />
        <Button type="submit" label={isNew ? "Save" : "Edit"} />
      </div>
    </form>
  );
};

export default DepartmentFormModal;
