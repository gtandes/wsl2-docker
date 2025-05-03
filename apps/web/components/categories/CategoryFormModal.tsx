import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import Select from "../Select";
import { Input } from "../Input";
import Button from "../Button";
import {
  Categories,
  useCreateCategoryMutation,
  useGetAllAgenciesQuery,
  useUpdateCategoryMutation,
} from "api";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notify,
  GENERIC_SUCCESS_SAVED,
  GENERIC_SUCCESS_CREATED,
} from "../Notification";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";
import clsx from "clsx";

const CategoryFormSchema = z.object({
  type: z.string().optional(),
  name: z.string().nonempty("Name is required"),
  agency: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

type Props = {
  onClose: () => void;
  type: "policy" | "document" | "question" | "competencies";
} & (
  | {
      isNew: true;
    }
  | {
      isNew: false;
      category: Categories;
    }
);

export const CategoryFormModal: React.FC<Props> = ({
  onClose,
  type,
  ...props
}) => {
  const auth = useAuth();
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const LIST_CATEGORIES = [
    {
      label: "Cat 2 - Specialties",
      value: "speciality",
    },
    {
      label: "Cat 3 - Sub-speciality",
      value: "sub_speciality",
    },
  ];

  const agenciesQuery = useGetAllAgenciesQuery({
    variables: {
      filter: isAgencyUser
        ? {
            _and: [
              {
                id: { _in: auth.currentUser?.agencies.flatMap((a) => a.id) },
              },
              { status: { _eq: "published" } },
            ],
          }
        : { status: { _eq: "published" } },
      sort: ["name"],
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
  });

  const agencyOptions = useMemo(() => {
    return agenciesQuery.data
      ? [
          {
            label: "All agencies",
            value: "",
          },
          ...agenciesQuery.data?.agencies.map((item) => ({
            label: item.name!,
            value: item.id,
          })),
        ]
      : [];
  }, [agenciesQuery]);

  const [createCategory] = useCreateCategoryMutation({
    refetchQueries: ["getAllCategories"],
  });

  const [updateCategory] = useUpdateCategoryMutation({
    refetchQueries: ["getAllCategories"],
  });

  const onSubmit = async (values: CategoryFormValues) => {
    if (props.isNew) {
      await createCategory({
        variables: {
          data: {
            title: values.name,
            type: type === "competencies" ? values.type : type,
            ...(values.agency && { agency: { id: values.agency } }),
            status: "published",
          },
        },
      });

      notify(GENERIC_SUCCESS_CREATED);
    } else {
      await updateCategory({
        variables: {
          id: props.category.id,
          data: {
            title: values.name,
            agency: values.agency ? { id: values.agency } : null,
            type: type === "competencies" ? values.type : type,
          },
        },
      });

      notify(GENERIC_SUCCESS_SAVED);
    }

    onClose();
  };

  useEffect(() => {
    if (!props.isNew) {
      if (!props.category.title) throw new Error("Title is undefined");
      if (!props.category.type) throw new Error("Type is undefined");

      form.setValue("type", props.category.type);
      form.setValue("name", props.category.title);
      form.setValue("agency", props?.category?.agency?.id);
    }
  }, [form, props]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      {type === "competencies" && (
        <Select
          label="Type of Category"
          register={form.register("type")}
          options={LIST_CATEGORIES}
          disabled={!props.isNew && props.category.type === "modality"}
        />
      )}
      <Select
        label="Agency"
        options={agencyOptions}
        register={form.register("agency")}
        classes={clsx("mt-1", isAgencyUser && "hidden")}
      />
      <Input
        error={form.formState.errors.name}
        register={form.register("name")}
        label="Name"
      />
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} label="Cancel" variant="outline" />
        <Button type="submit" label={props.isNew ? "Save" : "Edit"} />
      </div>
    </form>
  );
};
