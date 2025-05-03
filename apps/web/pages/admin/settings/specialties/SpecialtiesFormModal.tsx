import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  Specialties,
  useCreateSpecialtyMutation,
  useGetAllAgenciesQuery,
  useUpdateSpecialtyMutation,
} from "api";
import { Agency } from "../../../../types/global";

const SpecialtyFormSchema = z.object({
  name: z.string().nonempty("Name is required"),
});

type SpecialtyFormValues = z.infer<typeof SpecialtyFormSchema>;

type Props = {
  agency: Agency;
  specialty?: Specialties;
  onClose: () => void;
};

export const SpecialtiesFormModal: React.FC<Props> = ({
  agency,
  specialty,
  onClose,
  ...props
}) => {
  const isNew = !specialty;
  const form = useForm<SpecialtyFormValues>({
    resolver: zodResolver(SpecialtyFormSchema),
  });

  const [createSpecialty] = useCreateSpecialtyMutation({
    refetchQueries: ["GetAllSpecialtiesForListing"],
  });

  const [updateSpecialty] = useUpdateSpecialtyMutation({
    refetchQueries: ["GetAllSpecialtiesForListing"],
  });

  const { data: agenciesData, loading: loadingAgencies } =
    useGetAllAgenciesQuery({
      variables: {
        filter: { status: { _eq: "published" } },
        sort: ["name"],
      },
    });

  const onSubmit = async (values: SpecialtyFormValues) => {
    if (isNew) {
      await createSpecialty({
        variables: {
          data: {
            name: values.name,
            status: "published",
          },
        },
      });
      notify(GENERIC_SUCCESS_CREATED);
    } else {
      await updateSpecialty({
        variables: {
          id: specialty.id,
          data: {
            name: values.name,
          },
        },
      });
      notify(GENERIC_SUCCESS_SAVED);
    }

    onClose();
  };

  useEffect(() => {
    if (!isNew) {
      if (!specialty.name) throw new Error("Name is undefined");

      form.setValue("name", specialty.name);
    }
  }, [form, specialty, isNew]);

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
        <Button type="submit" label={isNew ? "Save" : "Edit"} />
      </div>
    </form>
  );
};

export default SpecialtiesFormModal;
