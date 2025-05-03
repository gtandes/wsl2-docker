import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import Button from "../../../Button";
import { Input } from "../../../Input";
import { useSysUpdateUserMutation } from "api";
import { useAuth } from "../../../../hooks/useAuth";
import { notify } from "../../../Notification";

const passwordRegex =
  /(?=^.{8,}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*\s).*$/;

const schema = z
  .object({
    password: z
      .string({
        required_error: "Password is required",
      })
      .min(8, "Password must be at least 8 characters")
      .max(50, "Password must be less than 50 characters")
      .nonempty("Password cannot be empty")
      .regex(passwordRegex, "Password does not meet rules."),
    password_confirmation: z
      .string({
        required_error: "Password confirmation is required",
      })
      .min(8, "Password must be at least 8 characters")
      .max(50, "Password must be less than 50 characters")
      .nonempty("Password cannot be empty")
      .regex(passwordRegex, "Password does not meet rules."),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["password_confirmation"],
      });
    }
  });

type FormType = z.infer<typeof schema>;

export const SettingsChangePassword = () => {
  const { currentUser } = useAuth();

  const form = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const [updateUser, updateUserResult] = useSysUpdateUserMutation();

  const handleChangePassword = async (data: FormType) => {
    if (!currentUser?.id) return;

    await updateUser({
      variables: {
        id: currentUser.id,
        data: {
          password: data.password,
        },
      },
    });

    notify({
      type: "success",
      title: "Password Updated",
      description: "Your password has been updated.",
    });

    form.reset();
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleChangePassword)}
      className="flex flex-col gap-5 rounded-lg bg-white px-10 py-8"
    >
      <div className="flex h-12 justify-between border-b border-gray-200">
        <h2 className="text-lg font-medium">Change Password</h2>
        <Button
          type="submit"
          label="Change Password"
          loading={updateUserResult.loading}
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-16 md:px-24 lg:flex-row">
        <div className="w-full text-xs font-normal">
          <p>The password must follow these rules:</p>
          <ul className="ml-4 list-outside list-disc">
            <li>It must be at least 8 characters long.</li>
            <li>It cannot contain any spaces.</li>
            <li>
              It must contain characters from at least 3 of the following 4
              character sets:
            </li>
            <ul className="ml-4 list-outside list-disc">
              <li>lower case letters (a, b, c ...)</li>
              <li>upper case letters (A, B, C ...)</li>
              <li>numerals (0, 1, 2 ...)</li>
              <li>special characters ({}.&#39;\`!@#$%^&()_-)</li>
            </ul>
          </ul>
        </div>
        <div className="flex w-full flex-col gap-6">
          <Input
            register={form.register("password")}
            label="Enter New Password"
            type="password"
            error={form.formState.errors.password}
          />
          <Input
            register={form.register("password_confirmation")}
            label="Confirm New Password"
            type="password"
            error={form.formState.errors.password_confirmation}
          />
        </div>
      </div>
    </form>
  );
};
