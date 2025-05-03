import React, { useEffect } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "./Input";
import { UserForClinicianFragment } from "api";

const validationSchema = z.object({
  first_name: z.string().nonempty({ message: "Required" }),
  last_name: z.string().nonempty({ message: "Required" }),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
});

export type ClinicianUserProfileFormValues = z.infer<typeof validationSchema>;

export const ClinicianUserProfileForm: React.FC<{
  children?: React.ReactNode;
  user?: UserForClinicianFragment;
  onSubmit: (formData: ClinicianUserProfileFormValues) => void;
}> = ({ children, onSubmit, user }) => {
  const form = useForm<ClinicianUserProfileFormValues>({
    resolver: zodResolver(validationSchema),
  });

  useEffect(() => {
    if (user) {
      user.first_name && form.setValue("first_name", user.first_name);
      user.last_name && form.setValue("last_name", user.last_name);
      user.address_line_1 &&
        form.setValue("address_line_1", user.address_line_1);
      user.address_line_2 &&
        form.setValue("address_line_2", user.address_line_2);
      user.city && form.setValue("city", user.city);
      user.state && form.setValue("state", user.state);
      user.zip && form.setValue("zip", user.zip);
      user.phone && form.setValue("phone", user.phone);
    }
  }, [form, user]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-4 lg:flex-row">
          <Input
            register={form.register("first_name")}
            label="First Name"
            required
            error={form.formState.errors.first_name}
          />
          <Input
            register={form.register("last_name")}
            label="Last Name"
            required
            error={form.formState.errors.last_name}
          />
        </div>
        <div className="flex w-full flex-col gap-4 lg:flex-row">
          <Input
            register={form.register("address_line_1")}
            label="Address Line 1"
            error={form.formState.errors.address_line_1}
          />
          <Input
            register={form.register("address_line_2")}
            label="Address Line 2"
            error={form.formState.errors.address_line_2}
          />
        </div>
        <div className="flex w-full flex-col gap-4 lg:flex-row">
          <Input
            register={form.register("city")}
            label="City"
            error={form.formState.errors.city}
          />
          <Input
            register={form.register("state")}
            label="State"
            error={form.formState.errors.state}
          />
          <Input
            register={form.register("zip")}
            label="Zip"
            error={form.formState.errors.zip}
          />
          <Input
            register={form.register("phone")}
            label="Phone"
            error={form.formState.errors.phone}
          />
        </div>
      </div>
      {children}
    </form>
  );
};
