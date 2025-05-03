import { zodResolver } from "@hookform/resolvers/zod";
import {
  DepartmentFragment,
  GetAllDepartmentsForSelectDocument,
  LocationFragment,
  GetAllLocationsForSelectDocument,
  useSysUserForSettingsQuery,
  useSysUpdateUserMutation,
  useUpdateJunctionUserAgencyMutation,
} from "api";
import { useForm } from "react-hook-form";
import z from "zod";
import Button from "../../../Button";
import { Input } from "../../../Input";
import QueryCombobox from "../../../QueryCombobox";
import { useAuth } from "../../../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useAgency } from "../../../../hooks/useAgency";
import { notify } from "../../../Notification";
import { formatDateForInput } from "../../../../utils/format";
import { UserRole } from "../../../../types/roles";
import { Spinner } from "../../../Spinner";
import { useWarnIfUnsavedChanges } from "../../../../hooks/useWarnIfUnsaved";

const schema = z.object({
  first_name: z
    .string({
      required_error: "First name is required",
    })
    .min(2, "First name must be at least 2 characters")
    .max(255, "First name must be less than 255 characters"),
  last_name: z
    .string({
      required_error: "Last name is required",
    })
    .min(2, "Last name must be at least 2 characters")
    .max(255, "Last name must be less than 255 characters"),
  employee_number: z.string().optional(),
  email: z
    .string({
      required_error: "Email is required",
    })
    .email("Please enter a valid email address"),
  admin_rights: z.string().optional(),
  address_line_1: z
    .string({
      required_error: "Address line 1 is required",
    })
    .max(255, "Address line 1 must be less than 255 characters")
    .optional(),
  address_line_2: z.string().max(255).optional(),
  city: z
    .string({
      required_error: "City is required",
    })
    .max(255, "City must be less than 255 characters")
    .optional(),
  state: z
    .string({
      required_error: "State is required",
    })
    .max(255, "State must be less than 255 characters")
    .optional(),
  zip_code: z
    .string({
      required_error: "Zip code is required",
    })
    .max(255, "Zip must be less than 255 characters")
    .optional(),
  phone: z
    .string({
      required_error: "Phone is required",
    })
    .max(255)
    .optional(),
  department: z.array(z.any()).optional(),
  location: z.array(z.any()).optional(),
  join_date: z.string().optional(),
});

type FormType = z.infer<typeof schema>;

export const SettingsUserInformation = () => {
  const { currentUser } = useAuth();
  const globalAgency = useAgency();

  const isAdminUser = currentUser?.role === UserRole.HSHAdmin;

  const [contentIsLoaded, setContentIsLoaded] = useState(false);

  const form = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  useWarnIfUnsavedChanges(form.formState.isDirty, () =>
    confirm(
      "You have unsaved changes. Are you sure you want to leave this page?"
    )
  );

  const [updateUser, updateUserResult] = useSysUpdateUserMutation({
    refetchQueries: ["sysUserForSettings"],
  });
  const [updateUserAgency, updateUserAgencyResult] =
    useUpdateJunctionUserAgencyMutation({
      refetchQueries: ["sysUserForSettings"],
    });

  const userQuery = useSysUserForSettingsQuery({
    variables: {
      id: currentUser?.id!,
    },
    skip: !currentUser?.id,
  });

  const user = userQuery.data?.users.at(0);

  const userAgency = useMemo(() => {
    return user?.agencies?.find(
      (a) => a?.agencies_id?.id === globalAgency?.currentAgency?.id
    );
  }, [globalAgency?.currentAgency?.id, user?.agencies]);

  useEffect(() => {
    if (user) {
      user.first_name && form.setValue("first_name", user.first_name);
      user.last_name && form.setValue("last_name", user.last_name);
      userAgency?.employee_number &&
        form.setValue("employee_number", userAgency?.employee_number);
      user.email && form.setValue("email", user.email);
      user.role?.name && form.setValue("admin_rights", user.role.name);
      user.address_line_1 &&
        form.setValue("address_line_1", user.address_line_1);
      user.address_line_2 &&
        form.setValue("address_line_2", user.address_line_2);
      user.city && form.setValue("city", user.city);
      user.state && form.setValue("state", user.state);
      user.zip && form.setValue("zip_code", user.zip);
      user.phone && form.setValue("phone", user.phone);
      userAgency?.departments &&
        form.setValue(
          "department",
          userAgency.departments.map((d) => d?.departments_id)
        );
      userAgency?.locations &&
        form.setValue(
          "location",
          userAgency.locations.map((l) => l?.locations_id)
        );
      userAgency?.date_created &&
        form.setValue("join_date", formatDateForInput(userAgency.date_created));
    }
    setContentIsLoaded(true);
  }, [form, user, userAgency]);

  const handleSaveChanges = async (values: FormType) => {
    if (!currentUser?.id || (!isAdminUser && !userAgency?.id)) return;

    const { department, location, employee_number, ...userValues } = values;

    const departmentIds = department?.map((d) => ({
      departments_id: {
        id: d.id,
      },
    }));
    const locationIds = location?.map((l) => ({
      locations_id: {
        id: l.id,
      },
    }));

    await updateUser({
      variables: {
        id: currentUser?.id,
        data: {
          first_name: userValues.first_name,
          last_name: userValues.last_name,
          address_line_1: userValues.address_line_1,
          address_line_2: userValues.address_line_2,
          city: userValues.city,
          state: userValues.state,
          zip: userValues.zip_code,
          phone: userValues.phone,
        },
      },
    });

    if (!isAdminUser) {
      await updateUserAgency({
        variables: {
          id: userAgency?.id as string,
          data: {
            departments: departmentIds || null,
            locations: locationIds || null,
            employee_number,
          },
        },
      });
    }

    notify({
      title: "User information updated.",
      type: "success",
    });

    form.reset(values);
  };

  return contentIsLoaded ? (
    <form
      onSubmit={form.handleSubmit(handleSaveChanges)}
      className="flex flex-col gap-5 rounded-lg bg-white px-10 py-8"
    >
      <div className="flex h-12 justify-between border-b border-gray-200">
        <h2 className="text-lg font-medium">User Information</h2>
        <Button
          type="submit"
          label="Save Changes"
          loading={updateUserResult.loading || updateUserAgencyResult.loading}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
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
        <Input
          register={form.register("employee_number")}
          label="Employee Number"
          type="number"
          disabled={isAdminUser}
          error={form.formState.errors.employee_number}
        />

        <Input
          register={form.register("email")}
          label="Login ID / Email"
          required
          classes="md:col-span-2"
          type="email"
          disabled
        />
        <Input
          register={form.register("admin_rights")}
          label="Admin Rights"
          disabled
        />

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
          register={form.register("zip_code")}
          label="Zip"
          error={form.formState.errors.zip_code}
        />
        <Input
          register={form.register("phone")}
          label="Phone"
          type="tel"
          error={form.formState.errors.phone}
        />

        <QueryCombobox<DepartmentFragment>
          query={GetAllDepartmentsForSelectDocument}
          name="department"
          filter={{}}
          label="Department"
          control={form.control}
          dataKey="departments"
          getLabel={(d) => d.name || ""}
          disabled={isAdminUser}
        />

        <QueryCombobox<LocationFragment>
          query={GetAllLocationsForSelectDocument}
          name="location"
          filter={{}}
          label="Location"
          control={form.control}
          dataKey="locations"
          getLabel={(l) => l.name || ""}
          disabled={isAdminUser}
        />

        <Input
          register={form.register("join_date")}
          disabled
          label="Join Date"
          type="date"
        />
      </div>
    </form>
  ) : (
    <div className="flex h-96 w-full items-center justify-center rounded-lg bg-white">
      <Spinner />
    </div>
  );
};
