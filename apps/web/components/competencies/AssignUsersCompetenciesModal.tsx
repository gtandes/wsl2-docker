import {
  DepartmentFragment,
  GetAllDepartmentsForFilterUsersOnAssignmentsDocument,
  GetAllLocationsForFilterUsersOnAssignmentsDocument,
  GetAllSpecialtiesForFilterUsersOnAssignmentsDocument,
  LocationFragment,
  SpecialtyFragment,
  SysUsersDocument,
  UserFragment,
} from "api";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "../../types/roles";
import { useAuth } from "../../hooks/useAuth";
import { useAgency } from "../../hooks/useAgency";
import { CloseModalHandler } from "../../hooks/useModal";
import Competencies from "./Competencies";
import Button from "../Button";
import { Agency } from "../../types/global";
import QueryCombobox from "../QueryCombobox";
import { GENERIC_ERROR, notify } from "../Notification";
import { first } from "lodash";
import { useMemo, useState } from "react";
import { editAssignmentDetailsValidation } from "../../utils/validations";
import { query } from "../../utils/utils";
import { isAfter, parseISO } from "date-fns";

const schema = z
  .object({
    users_by: z
      .object({
        users: z.array(z.any()),
        departments: z.array(z.any()),
        locations: z.array(z.any()),
        specialties: z.array(z.any()),
        supervisors: z.array(z.any()),
      })
      .partial()
      .refine(
        (val) => {
          for (const users of Object.values(val)) {
            if (users.length) return true;
          }
          return false;
        },
        { message: "At least one user group is required." }
      ),
    competencies: z
      .object({
        exams: z.array(z.any()),
        modules: z.array(z.any()),
        skills_checklists: z.array(z.any()),
        policies: z.array(z.any()),
        documents: z.array(z.any()),
        bundles: z.array(z.any()),
      })
      .partial()
      .refine(
        (val) => {
          for (const comp of Object.values(val)) {
            if (comp.length) return true;
          }
          return false;
        },
        { message: "At least one competency is required." }
      ),
    edit_assignments: z.boolean(),
    details: z.object({
      due_date: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;

            return isAfter(new Date(parseISO(val)), new Date());
          },
          { message: "Due date must be in the future." }
        ),
      allowed_attempts: z.string().optional(),
      expiration: z.string().optional(),
    }),
  })
  .superRefine(editAssignmentDetailsValidation);

type FormUsersCompetenciesValues = z.infer<typeof schema>;
interface Props {
  onClose: CloseModalHandler;
}

export default function AssignUsersCompentenciesModal({ onClose }: Props) {
  const auth = useAuth();
  const globalAgency = useAgency();
  const [loading, setLoading] = useState<boolean>(false);
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const agency = isAgencyUser
    ? (first(auth.currentUser?.agencies) as Agency)
    : globalAgency.currentAgency;
  const form = useForm<FormUsersCompetenciesValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        users_by: {
          users: [],
          departments: [],
          locations: [],
          specialties: [],
          supervisors: [],
        },
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
      }),
      [globalAgency]
    ),
  });

  const onSubmit = async (values: FormUsersCompetenciesValues) => {
    const competencies = values.competencies;
    const users_by = values.users_by;
    const details = values.details;
    setLoading(true);
    const response = await query(`/cms/assignments/competencies`, "POST", {
      users_by,
      competencies,
      details,
      agency: agency?.id,
    });

    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }

    notify({
      title: "Success!",
      description: "Competencies assigned successfully.",
      type: "success",
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <QueryCombobox<UserFragment>
          query={SysUsersDocument}
          name="users_by.users"
          label="User(s):"
          control={form.control}
          filter={{
            status: { _eq: "active" },
            agencies: {
              _and: [
                { agencies_id: { id: { _eq: agency?.id } } },
                { status: { _eq: "active" } },
              ],
            },
            role: {
              id: {
                _eq: UserRole.Clinician,
              },
            },
          }}
          getLabel={(u) =>
            `${[u.first_name, u.last_name].join(" ")} - ${u.email}`
          }
          dataKey="users"
          placeholder="Select"
        />

        <QueryCombobox<DepartmentFragment>
          query={GetAllDepartmentsForFilterUsersOnAssignmentsDocument}
          name="users_by.departments"
          label="Users by Department:"
          control={form.control}
          filter={{
            status: { _eq: "published" },
            agency: { id: { _eq: agency?.id } },
          }}
          getLabel={(c) => c.name || ""}
          dataKey="departments"
          placeholder="Select"
          fetchPolicy="cache-first"
        />

        <QueryCombobox<LocationFragment>
          query={GetAllLocationsForFilterUsersOnAssignmentsDocument}
          name="users_by.locations"
          label="Users by Location:"
          control={form.control}
          filter={{
            status: { _eq: "published" },
            agency: { id: { _eq: agency?.id } },
          }}
          getLabel={(c) => c.name || ""}
          dataKey="locations"
          placeholder="Select"
        />

        <QueryCombobox<SpecialtyFragment>
          query={GetAllSpecialtiesForFilterUsersOnAssignmentsDocument}
          name="users_by.specialties"
          label="Users by Specialties:"
          control={form.control}
          filter={{
            status: { _eq: "published" },
          }}
          getLabel={(c) => c.name || ""}
          dataKey="specialties"
          placeholder="Select"
        />

        <QueryCombobox<UserFragment>
          query={SysUsersDocument}
          name="users_by.supervisors"
          label="Users by Supervisors:"
          control={form.control}
          filter={{
            status: { _eq: "active" },
            agencies: { agencies_id: { id: { _eq: agency?.id } } },
            role: {
              id: {
                _in: [
                  UserRole.AgencyUser,
                  UserRole.UsersManager,
                  UserRole.CredentialingUser,
                ],
              },
            },
          }}
          getLabel={(u) =>
            `${[u.first_name, u.last_name].join(" ")} - ${u.email}`
          }
          dataKey="users"
          placeholder="Select"
        />
      </div>

      {form.formState.errors?.users_by && (
        <p className="mt-2 text-xs text-red-500">
          {form.formState.errors.users_by.message}
        </p>
      )}
      <Competencies formContext={form} agency={agency} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          label="Cancel"
        />
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          label="Assign"
          loading={loading}
        />
      </div>
    </div>
  );
}
