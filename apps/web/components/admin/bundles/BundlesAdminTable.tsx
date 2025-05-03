import { faTrash } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BundleFragment } from "api";
import router from "next/router";
import { useAdminTable } from "../../../hooks/useAdminTable";
import {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { DirectusStatus } from "types";

interface BundlesAdminTableProps {
  canEdit: boolean;
  handleDeleteBundle: (id: string) => void;
  totalPages: number;
  page: PaginationState;
  setPage: OnChangeFn<PaginationState>;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  loading: boolean;
  loadingDeleteBundle: boolean;
  bundles: BundleFragment[];
  pageSize: number;
}

export const BundlesAdminTable: React.FC<BundlesAdminTableProps> = ({
  bundles,
  pageSize,
  canEdit,
  loadingDeleteBundle,
  handleDeleteBundle,
  loading,
  page,
  setPage,
  setSort,
  sort,
  totalPages,
}) => {
  const adminTable = useAdminTable<BundleFragment>({
    columns: [
      {
        header: "Name",
        accessorKey: "name",
        id: "name",
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal">{row.original.name}</div>
        ),
      },
      {
        header: "Exams",
        accessorKey: "exams",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.exams?.filter(
            (exam) => exam?.exams_id?.status === DirectusStatus.PUBLISHED
          )?.length,
      },
      {
        header: "Modules",
        accessorKey: "modules",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.modules?.filter(
            (module) =>
              module?.modules_definition_id?.status === DirectusStatus.PUBLISHED
          ).length,
      },
      {
        header: "Skills Checklists",
        accessorKey: "skills_checklists",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.skills_checklists?.filter(
            (sc) => sc?.sc_definitions_id?.status === DirectusStatus.PUBLISHED
          ).length,
      },
      {
        header: "Policies",
        accessorKey: "policies",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.policies?.filter(
            (policy) => policy?.policies_id?.status === DirectusStatus.PUBLISHED
          ).length,
      },
      {
        header: "Documents",
        accessorKey: "documents",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.documents?.filter(
            (document) =>
              document?.documents_id?.status === DirectusStatus.PUBLISHED
          ).length,
      },

      {
        header: "Categories (1, 2 & 3)",
        accessorKey: "categories",
        enableSorting: false,
        cell: ({ row }) => {
          const categories: string[] = [];

          row.original.exams?.forEach((exam) => {
            const modality = exam?.exams_id?.modality?.title;
            const specialties = exam?.exams_id?.specialties;
            const subSpecialties = exam?.exams_id?.subspecialties;

            if (modality && !categories.includes(modality)) {
              categories.push(modality);
            }
            if (specialties) {
              specialties.forEach((specialty) => {
                const title = specialty?.categories_id?.title;
                if (title && !categories.includes(title)) {
                  categories.push(title);
                }
              });
            }
            if (subSpecialties) {
              subSpecialties.forEach((subSpecialty) => {
                const title = subSpecialty?.categories_id?.title;
                if (title && !categories.includes(title)) {
                  categories.push(title);
                }
              });
            }
          });

          row.original.modules?.forEach((module) => {
            const modality = module?.modules_definition_id?.modality?.title;
            const specialty = module?.modules_definition_id?.specialty?.title;
            const subSpecialty =
              module?.modules_definition_id?.sub_specialty?.title;

            if (modality && !categories.includes(modality)) {
              categories.push(modality);
            }
            if (specialty && !categories.includes(specialty)) {
              categories.push(specialty);
            }
            if (subSpecialty && !categories.includes(subSpecialty)) {
              categories.push(subSpecialty);
            }
          });

          row.original.skills_checklists?.forEach((skillsChecklist) => {
            const modality =
              skillsChecklist?.sc_definitions_id?.category?.title;
            const specialty =
              skillsChecklist?.sc_definitions_id?.speciality?.title;
            const subSpecialty =
              skillsChecklist?.sc_definitions_id?.sub_speciality?.title;

            if (modality && !categories.includes(modality)) {
              categories.push(modality);
            }
            if (specialty && !categories.includes(specialty)) {
              categories.push(specialty);
            }
            if (subSpecialty && !categories.includes(subSpecialty)) {
              categories.push(subSpecialty);
            }
          });

          return (
            <div className="w-28 whitespace-normal text-xs capitalize">
              {categories.join(", ")}
            </div>
          );
        },
      },
      {
        header: "Agency",
        accessorKey: "agency",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal">
            {row.original.agency?.name || "All"}
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        enableSorting: true,
        cell: ({ row }) => {
          const statusMap = {
            draft: "Draft",
            published: "Published",
            archived: "Archived",
          };
          const status = row.original.status as keyof typeof statusMap;
          return statusMap[status];
        },
      },
      {
        header: "",
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) =>
          canEdit ? (
            <button
              type="button"
              disabled={!canEdit || loadingDeleteBundle}
              onClick={() => handleDeleteBundle(row.original.id)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300 disabled:bg-gray-200 disabled:text-white"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          ) : null,
      },
    ],
    data: bundles,
    pageCount: Math.ceil(totalPages / pageSize),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loading,
    totalItems: totalPages,
    onRowClick: (row) => router.push(`/admin/bundles/${row.id}`),
  });

  return <adminTable.Component />;
};
