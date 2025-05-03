import {
  DocumentFragment,
  GetAllDocumentForAssignCompetencyDocument,
  GetAllExamsForAssignCompetencyDocument,
  ExamFragment,
  GetModulesDefinitionsForAssignmentDocument,
  Modules_Definition,
  SkillChecklistFragment,
  GetSkillChecklistsDetailsDocument,
  GetAllPoliciesForAssignmentDocument,
  PoliciesFragment,
  GetAllBundlesForAssignCompetencyDocument,
  BundleFragment,
} from "api";
import { FieldValues } from "react-hook-form";
import QueryCombobox from "../QueryCombobox";
import { Agency } from "../../types/global";
import EditAssignmentDetails from "./EditAssignmentDetails";
import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";
import { DirectusStatus, ExpirationType } from "types";

interface Props<FormContext extends FieldValues> {
  agency: Agency | undefined;
  formContext: FormContext;
  excludedIds?: {
    modules: string[];
    exams: string[];
    policies: string[];
    skillChecklists: string[];
    documents: string[];
  };
}

export default function Competencies<FormContext extends FieldValues>({
  formContext,
  agency,
  excludedIds,
}: Props<FormContext>) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [excludeGlobalBundles, setExcludeGlobalBundles] =
    useState<boolean>(false);
  const auth = useAuth();
  const formErrors = formContext.formState.errors as FormContext;
  const publishedFilter = {
    status: {
      _eq: DirectusStatus.PUBLISHED,
    },
  };

  const generalFilter = {
    ...publishedFilter,
    agencies: {
      _or: [
        { agencies_id: { id: { _eq: agency?.id } } },
        { agencies_id: { id: { _null: true } } },
      ],
    },
  };

  const scFilter = {
    ...publishedFilter,
    agency: {
      _or: [
        { agencies_id: { id: { _eq: agency?.id } } },
        { agencies_id: { id: { _null: true } } },
      ],
    },
  };

  const bundleFilter = useMemo(() => {
    const filter = {
      _and: [
        {
          ...publishedFilter,
        },
        {
          agency: {
            _or: [{ id: { _eq: agency?.id } }, { id: { _null: true } }],
          },
        },
      ],
    };

    if (excludeGlobalBundles) {
      filter._and[1].agency?._or.pop();
    }

    return filter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeGlobalBundles]);

  const handleEditAssignmentDetails = () => {
    const isOpen = !showDetails;
    setShowDetails(isOpen);
    formContext.setValue("edit_assignments", isOpen);
    if (!isOpen) {
      formContext.setValue("details.due_date", "");
      formContext.setValue("details.allowed_attempts", "");
      formContext.setValue("details.expiration", "");
    } else {
      formContext.setValue("details.expiration", ExpirationType.ONE_TIME);
    }
  };

  return (
    <>
      {auth.currentUser?.role !== UserRole.UsersManager &&
        auth.currentUser?.role !== UserRole.Clinician && (
          <p className="mb-1 block text-xs text-gray-700">
            Competencies:{" "}
            {showDetails ? (
              <span className="text-red-500">
                Warning: Closing this section will revert assignments to its
                default values.
              </span>
            ) : (
              <span
                className="cursor-pointer text-blue-800 underline"
                onClick={handleEditAssignmentDetails}
              >
                Edit Assignment Details
              </span>
            )}
          </p>
        )}
      {showDetails && (
        <EditAssignmentDetails
          formContext={formContext}
          handleClose={handleEditAssignmentDetails}
        />
      )}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <QueryCombobox<ExamFragment>
          query={GetAllExamsForAssignCompetencyDocument}
          name="competencies.exams"
          label="Exams:"
          control={formContext.control}
          filter={generalFilter}
          excludedIds={excludedIds?.exams}
          fetchPolicy="cache-first"
          getLabel={(c) =>
            `${c.title} ${
              c.agencies?.length
                ? `- ${c.agencies
                    .map((agency) => agency?.agencies_id?.name)
                    .join("-")}`
                : ""
            }` || ""
          }
          dataKey="exams"
          placeholder="Select"
        />

        <QueryCombobox<Modules_Definition>
          query={GetModulesDefinitionsForAssignmentDocument}
          name="competencies.modules"
          label="Modules:"
          control={formContext.control}
          filter={generalFilter}
          excludedIds={excludedIds?.modules}
          fetchPolicy="cache-first"
          getLabel={(c) =>
            `${c.title} ${
              c.agencies?.length
                ? `- ${c.agencies
                    .map((agency) => agency?.agencies_id?.name)
                    .join("-")}`
                : ""
            }` || ""
          }
          dataKey="modules_definition"
          placeholder="Select"
        />

        <QueryCombobox<SkillChecklistFragment>
          query={GetSkillChecklistsDetailsDocument}
          name="competencies.skills_checklists"
          label="Skills Checklists:"
          control={formContext.control}
          filter={scFilter}
          excludedIds={excludedIds?.skillChecklists}
          fetchPolicy="cache-first"
          getLabel={(c) =>
            `${c.title} ${
              c.agency?.length
                ? `- ${c.agency
                    .map((agency) => agency?.agencies_id?.name)
                    .join("-")}`
                : ""
            }` || ""
          }
          dataKey="sc_definitions"
          placeholder="Select"
        />

        <QueryCombobox<PoliciesFragment>
          query={GetAllPoliciesForAssignmentDocument}
          name="competencies.policies"
          label="Policies:"
          control={formContext.control}
          filter={generalFilter}
          excludedIds={excludedIds?.policies}
          fetchPolicy="cache-first"
          getLabel={(c) =>
            `${c.name} ${
              c.agencies?.length
                ? `- ${c.agencies
                    .map((agency) => agency?.agencies_id?.name)
                    .join("-")}`
                : ""
            }` || ""
          }
          dataKey="policies"
          placeholder="Select"
        />

        <QueryCombobox<DocumentFragment>
          query={GetAllDocumentForAssignCompetencyDocument}
          name="competencies.documents"
          label="Documents:"
          control={formContext.control}
          filter={generalFilter}
          excludedIds={excludedIds?.documents}
          fetchPolicy="cache-first"
          getLabel={(c) =>
            `${c.title} ${
              c.agencies?.length
                ? `- ${c.agencies
                    .map((agency) => agency?.agencies_id?.name)
                    .join("-")}`
                : ""
            }` || ""
          }
          dataKey="documents"
          placeholder="Select"
        />
        <div>
          <QueryCombobox<BundleFragment>
            query={GetAllBundlesForAssignCompetencyDocument}
            name="competencies.bundles"
            label="Bundles:"
            control={formContext.control}
            filter={bundleFilter}
            fetchPolicy="cache-first"
            getLabel={(c) =>
              `${c.name} ${c.agency ? `- ${c.agency.name}` : ""}` || ""
            }
            dataKey="bundles"
            placeholder="Select"
            showTooltip
            getTooltipContent={(item) => {
              const modules = item?.modules
                ?.map((m) =>
                  m?.modules_definition_id?.status === DirectusStatus.PUBLISHED
                    ? m?.modules_definition_id?.title
                    : null
                )
                .filter((module) => module !== null);

              const exams = item?.exams
                ?.map((e) =>
                  e?.exams_id?.status === DirectusStatus.PUBLISHED
                    ? e?.exams_id?.title
                    : null
                )
                .filter((exam) => exam !== null);

              const policies = item?.policies
                ?.map((p) =>
                  p?.policies_id?.status === DirectusStatus.PUBLISHED
                    ? p?.policies_id?.name
                    : null
                )
                .filter((policy) => policy !== null);

              const documents = item?.documents
                ?.map((d) =>
                  d?.documents_id?.status === DirectusStatus.PUBLISHED
                    ? d?.documents_id?.title
                    : null
                )
                .filter((document) => document !== null);

              const skillsChecklists = item?.skills_checklists
                ?.map((s) =>
                  s?.sc_definitions_id?.status === DirectusStatus.PUBLISHED
                    ? s?.sc_definitions_id?.title
                    : null
                )
                .filter((checklist) => checklist !== null);

              const competencies = [
                ...(modules || []),
                ...(exams || []),
                ...(policies || []),
                ...(documents || []),
                ...(skillsChecklists || []),
              ];

              if (competencies.length === 0) {
                return null;
              }

              return (
                <div className="relative flex w-52 flex-col gap-2 rounded bg-black px-4 pb-2 pt-1 text-white">
                  <p className="text-center text-sm">Assignment List</p>
                  <ul className="list-disc overflow-hidden text-ellipsis px-4 text-xs">
                    {competencies.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
              onClick={() => setExcludeGlobalBundles(!excludeGlobalBundles)}
            />
            Exclude global bundles
          </label>
        </div>
      </div>
      {formErrors?.competencies && (
        <p className="mt-2 text-xs text-red-500">
          {formErrors.competencies.message}
        </p>
      )}
    </>
  );
}
