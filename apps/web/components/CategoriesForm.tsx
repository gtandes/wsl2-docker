import React, { useEffect } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Select from "./Select";
import { Input } from "./Input";

const validationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { message: "Required" }),
  type: z.string().min(1, { message: "Required" }),
});

export type CategoriesFormData = z.infer<typeof validationSchema>;

export const CategoryForm: React.FC<{
  children?: React.ReactNode;
  initialValues?: CategoriesFormData;
  onSubmit: (formData: CategoriesFormData) => void;
}> = ({ children, initialValues, onSubmit }) => {
  const form = useForm<CategoriesFormData>({
    resolver: zodResolver(validationSchema),
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <Input
        label="Category"
        placeholder="Category name"
        error={form.formState.errors.title}
        required
        register={form.register("title")}
      />

      <Select
        label="Type"
        required
        options={[
          {
            value: "exam",
            label: "Exam",
          },
          {
            value: "question",
            label: "Question",
          },
          // {
          //   value: "module",
          //   label: "Module",
          // },
          // {
          //   value: "policy",
          //   label: "Policy",
          // },
          // {
          //   value: "document",
          //   label: "Document",
          // },
        ]}
        register={form.register("type")}
      />
      {children}
    </form>
  );
};
