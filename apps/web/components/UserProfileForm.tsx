/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "./Input";
import {
  useDepartmentsQuery,
  useLocationsQuery,
  UserForAssignmentFragment,
  UserForCrudFragment,
  useSpecialtiesQuery,
  useSysUsersQuery,
} from "api";
import Select from "./Select";
import { getRoleOptions, UserRole } from "../types/roles";
import { useAuth } from "../hooks/useAuth";
import { useAgency } from "../hooks/useAgency";
import { Combobox } from "./Combobox";
import { Toggle } from "./Toggle";
import { useDebounce } from "usehooks-ts";
import { first } from "lodash";
import Competencies from "./competencies/Competencies";
import { Agency } from "../types/global";
import { editAssignmentDetailsValidation } from "../utils/validations";
import clsx from "clsx";
import { DirectusStatus } from "types";

type UsersGrouping = {
  __typename?: "specialties" | "locations" | "departments";
  id: string;
  name?: string | null;
};

const validationSchema = z
  .object({
    active: z.boolean(),
    first_name: z.string().nonempty({ message: "Required" }),
    last_name: z.string().nonempty({ message: "Required" }),
    email: z
      .string()
      .email({ message: "It should be an email" })
      .nonempty({ message: "Required" }),
    employee_number: z.string().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().nonempty({ message: "Required" }),
    supervisors: z.array(z.any()).optional(),
    specialties: z.array(z.any()).optional(),
    departments: z.array(z.any()).optional(),
    locations: z.array(z.any()).optional(),
    competencies: z.object({
      exams: z.array(z.any()).optional(),
      modules: z.array(z.any()).optional(),
      skills_checklists: z.array(z.any()).optional(),
      policies: z.array(z.any()).optional(),
      documents: z.array(z.any()).optional(),
      bundles: z.array(z.any()).optional(),
    }),
    edit_assignments: z.boolean(),
    details: z.object({
      due_date: z.string().optional(),
      allowed_attempts: z.string().optional(),
      expiration: z.string().optional(),
    }),
  })
  .superRefine(editAssignmentDetailsValidation);

export type UserProfileFormValues = z.infer<typeof validationSchema>;

export const UserProfileForm: React.FC<{
  children?: React.ReactNode;
  user?: UserForCrudFragment;
  onSubmit: (formData: UserProfileFormValues) => void;
  createAdmin?: boolean;
  showAdminRoleOption?: boolean;
  isCreating?: boolean;
}> = ({
  children,
  onSubmit,
  user,
  createAdmin,
  showAdminRoleOption,
  isCreating,
}) => {
  const auth = useAuth();
  const globalAgency = useAgency();
  const isAdmin = [UserRole.HSHAdmin, UserRole.Developer].includes(
    auth.currentUser?.role!
  );
  const agency =
    !createAdmin && isAdmin
      ? globalAgency.currentAgency?.id
      : first(auth.currentUser?.agencies)?.id;

  const [usersSearchQuery, setUsersSearchQuery] = useState("");
  const debouncedUserSearchQuery = useDebounce(usersSearchQuery, 400);
  const [specialtiesSearchQuery, setSpecialtiesSearchQuery] = useState("");
  const debouncedSpecialtySearchQuery = useDebounce(
    specialtiesSearchQuery,
    400
  );
  const [locationsSearchQuery, setLocationsSearchQuery] = useState("");
  const debouncedLocationSearchQuery = useDebounce(locationsSearchQuery, 400);
  const [departmentsSearchQuery, setDepartmentsSearchQuery] = useState("");
  const debouncedDepartmentSearchQuery = useDebounce(
    departmentsSearchQuery,
    400
  );

  const isCredUser = [UserRole.CredentialingUser].includes(
    auth.currentUser?.role!
  );
  const isUserManager = [UserRole.UsersManager].includes(
    auth.currentUser?.role!
  );
  const isAgencyUser = [UserRole.AgencyUser].includes(auth.currentUser?.role!);

  const canEditProfile = () => {
    if (user) {
      if (user.role?.id === UserRole.Clinician) {
        return true;
      }
      if (user.role?.id === UserRole.AgencyUser) {
        return isAdmin || isAgencyUser;
      }
      if (user.role?.id === UserRole.CredentialingUser) {
        return isAdmin || isCredUser || isAgencyUser;
      }
      if (user.role?.id === UserRole.UsersManager) {
        return isAdmin || isUserManager || isCredUser || isAgencyUser;
      }
    }
    return false;
  };

  const disableFields = !isCreating && !canEditProfile();

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(validationSchema),
    values: useMemo(() => {
      const agencyData = user?.agencies?.find(
        (a) => a?.agencies_id?.id === agency
      );

      return {
        active:
          agencyData?.status === DirectusStatus.ACTIVE ||
          (user?.role?.id === UserRole.HSHAdmin &&
            user?.status === DirectusStatus.ACTIVE),
        email: user?.email as string,
        first_name: user?.first_name as string,
        last_name: user?.last_name as string,
        employee_number: agencyData?.employee_number || undefined,
        address_line_1: user?.address_line_1 || undefined,
        address_line_2: user?.address_line_2 || undefined,
        city: user?.city || undefined,
        state: user?.state || undefined,
        zip: user?.zip || undefined,
        phone: user?.phone || undefined,
        role: user?.role?.id as string,
        specialties: agencyData?.specialties?.map((s) => s?.specialties_id),
        departments: agencyData?.departments?.map((d) => d?.departments_id),
        locations: agencyData?.locations?.map((l) => l?.locations_id),
        supervisors: agencyData?.supervisors?.map((s) => s?.directus_users_id),
        competencies: {
          exams: [],
          modules: [],
          skills_checklists: [],
          policies: [],
          documents: [],
          bundles: [],
        },
        edit_assignments: false,
        details: {
          due_date: "",
          allowed_attempts: "",
          expiration: "",
        },
      };
    }, [
      agency,
      user?.agencies,
      user?.address_line_1,
      user?.address_line_2,
      user?.city,
      user?.email,
      user?.first_name,
      user?.last_name,
      user?.phone,
      user?.role?.id,
      user?.state,
      user?.zip,
    ]),
  });

  const specialtiesQuery = useSpecialtiesQuery({
    variables: {
      filter: { status: { _eq: DirectusStatus.PUBLISHED } },
      sort: ["name"],
      search: debouncedSpecialtySearchQuery,
    },
  });

  const departmentsQuery = useDepartmentsQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        agency: { id: { _eq: agency } },
      },
      sort: ["name"],
      search: debouncedDepartmentSearchQuery,
    },
    skip: !agency,
  });

  const locationsQuery = useLocationsQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        agency: { id: { _eq: agency } },
      },
      sort: ["name"],
      search: debouncedLocationSearchQuery,
    },
    skip: !agency,
  });

  const supervisorsQuery = useSysUsersQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.ACTIVE },
        agencies: { agencies_id: { id: { _eq: agency } } },
        role: {
          id: {
            // TODO check UMs appear
            _in: [
              UserRole.AgencyUser,
              UserRole.UsersManager,
              UserRole.CredentialingUser,
            ],
          },
        },
      },
      search: debouncedUserSearchQuery,
      sort: ["last_name"],
    },
    skip: !agency,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div
        className={clsx(
          "mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
          createAdmin ? "hidden" : ""
        )}
      >
        <Select
          label="Role"
          options={getRoleOptions(
            auth.currentUser?.role as UserRole,
            createAdmin,
            showAdminRoleOption,
            user?.role?.id as UserRole,
            isCreating
          )}
          register={form.register("role")}
          disabled={disableFields}
        />

        {user && user?.status !== DirectusStatus.ARCHIVED && (
          <Toggle
            name="active"
            label="Active"
            control={form.control}
            disabled={disableFields}
          />
        )}
      </div>
      <div
        className={clsx(
          "mb-4 grid grid-cols-1 gap-4 md:grid-cols-2",
          createAdmin ? "lg:grid-cols-3" : "lg:grid-cols-4"
        )}
      >
        <Input
          register={form.register("email")}
          label="Login ID / Email"
          required
          error={form.formState.errors.email}
          disabled={user?.role?.id === UserRole.HSHAdmin || disableFields}
        />
        <Input
          register={form.register("first_name")}
          label="First Name"
          required
          error={form.formState.errors.first_name}
          disabled={disableFields}
        />
        <Input
          register={form.register("last_name")}
          label="Last Name"
          required
          error={form.formState.errors.last_name}
          disabled={disableFields}
        />
        {createAdmin ||
          (user?.role?.id !== UserRole.HSHAdmin && (
            <Input
              register={form.register("employee_number")}
              label="Employee Number"
              error={form.formState.errors.employee_number}
              disabled={disableFields}
            />
          ))}
      </div>
      {user && !(createAdmin || user.role?.id === UserRole.HSHAdmin) && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              register={form.register("address_line_1")}
              label="Address Line 1"
              error={form.formState.errors.address_line_1}
              disabled={disableFields}
            />
            <Input
              register={form.register("address_line_2")}
              label="Address Line 2"
              error={form.formState.errors.address_line_2}
              disabled={disableFields}
            />
            <Input
              register={form.register("city")}
              label="City"
              error={form.formState.errors.city}
              disabled={disableFields}
            />
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              register={form.register("state")}
              label="State"
              error={form.formState.errors.state}
              disabled={disableFields}
            />
            <Input
              register={form.register("zip")}
              label="Zip"
              error={form.formState.errors.zip}
              disabled={disableFields}
            />
            <Input
              register={form.register("phone")}
              label="Phone"
              error={form.formState.errors.phone}
              disabled={disableFields}
            />
          </div>
        </>
      )}
      {form.watch("role") === UserRole.Clinician && (
        <>
          <div className="my-6 border-b"></div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Combobox<UsersGrouping>
              name="specialties"
              control={form.control}
              label="Specialties"
              options={specialtiesQuery.data?.specialties ?? []}
              multiple
              query={specialtiesSearchQuery}
              setQuery={setSpecialtiesSearchQuery}
              getLabel={(u) => u.name || ""}
              by="id"
              displaySelectedValues
              placeholder="Select"
              disabled={disableFields}
            />
            <Combobox<UsersGrouping>
              name="departments"
              control={form.control}
              label="Departments"
              options={departmentsQuery.data?.departments ?? []}
              multiple
              query={departmentsSearchQuery}
              setQuery={setDepartmentsSearchQuery}
              getLabel={(u) => u.name || ""}
              by="id"
              displaySelectedValues
              placeholder="Select"
              disabled={disableFields}
            />
            <Combobox<UsersGrouping>
              name="locations"
              control={form.control}
              label="Locations"
              options={locationsQuery.data?.locations ?? []}
              multiple
              query={locationsSearchQuery}
              setQuery={setLocationsSearchQuery}
              getLabel={(u) => u.name || ""}
              by="id"
              displaySelectedValues
              placeholder="Select"
              disabled={disableFields}
            />
            <Combobox<UserForAssignmentFragment>
              name="supervisors"
              control={form.control}
              label="Supervisors"
              options={supervisorsQuery.data?.users ?? []}
              multiple
              query={usersSearchQuery}
              setQuery={setUsersSearchQuery}
              getLabel={(u) =>
                `${[u.first_name, u.last_name].join(" ")} - ${u.email}`
              }
              by="id"
              displaySelectedValues
              placeholder="Select"
              disabled={disableFields}
            />
          </div>
          {!user && (
            <>
              <div className="my-6 border-b"></div>
              <Competencies
                formContext={form}
                agency={{ id: agency } as Agency}
              />
            </>
          )}
        </>
      )}

      {![UserRole.HSHAdmin, UserRole.Clinician].includes(
        form.watch("role") as UserRole
      ) && (
        <>
          <div className="my-6 border-b"></div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Combobox<UsersGrouping>
              name="departments"
              control={form.control}
              label="Departments"
              options={departmentsQuery.data?.departments ?? []}
              multiple
              query={departmentsSearchQuery}
              setQuery={setDepartmentsSearchQuery}
              getLabel={(u) => u.name || ""}
              by="id"
              displaySelectedValues
              placeholder="Select"
              disabled={disableFields}
            />
          </div>
        </>
      )}
      <div className="my-6 border-b"></div>
      {children}
    </form>
  );
};
