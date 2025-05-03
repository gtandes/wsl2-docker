import { faCirclePlus, faTrash } from "@fortawesome/pro-regular-svg-icons";
import {
  AllQuestionsForListFragment,
  Questions_Filter,
  useGetAllCategoriesQuery,
  useGetAllQuestionsQuery,
  useUpdateQuestionMutation,
} from "api";
import React, { useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAdminTable } from "../../hooks/useAdminTable";
import Button from "../Button";
import { QuestionModal } from "./QuestionModal";
import { ColumnDef, Row } from "@tanstack/react-table";
import { useModal } from "../../hooks/useModal";
import { GENERIC_SUCCESS_DELETED, notify } from "../Notification";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SelectFilter } from "../SelectFilter";
import { SearchInput } from "../SearchInput";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../types/global";
const PAGE_SIZE = 10;

interface Props {
  mode?: "modal" | "page";
  onSelect?: (questions: string[]) => void;
}

export const QuestionsList: React.FC<Props> = ({
  mode = "page",
  onSelect,
}: Props) => {
  const modal = useModal();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [rowSelection, setRowSelection] = useState({});
  const [category, setCategory] = useState<string>("");
  const auth = useAuth();
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "date_created",
        desc: true,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  const categoriesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        type: { _eq: "question" },
      },
      sort: ["title"],
      limit: -1,
    },
  });

  const filter = useMemo<Questions_Filter>(() => {
    const filter: Questions_Filter = {
      _and: [
        {
          status: {
            _eq: DirectusStatus.PUBLISHED,
          },
        },
      ],
    };
    if (category) {
      filter._and?.push({ category: { id: { _eq: category } } });
    }
    return filter;
  }, [category]);

  const questionsQuery = useGetAllQuestionsQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: page.pageIndex * PAGE_SIZE,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      search: debouncedSearchQuery,
      filter,
    },
  });

  const [updateQuestion] = useUpdateQuestionMutation();
  const categoryOptions = categoriesQuery.data
    ? [
        {
          label: "All Categories",
          value: "",
        },
        ...categoriesQuery.data?.categories.map((item) => ({
          label: item.title!,
          value: item.id,
        })),
      ]
    : [];

  const tableColumns: ColumnDef<AllQuestionsForListFragment>[] = [
    {
      header: "Question",
      accessorKey: "title",
      enableSorting: true,
      cell: ({ row }) => (
        <p
          className="w-[300px] overflow-hidden overflow-ellipsis whitespace-nowrap"
          title={row.original.title as string}
        >
          {row.original.title}
        </p>
      ),
    },
    {
      header: "Correct Answer",
      accessorKey: "id",
      enableSorting: true,
      cell: ({ row }) => (
        <p className="w-[300px] overflow-hidden overflow-ellipsis whitespace-nowrap">
          {
            (row.original.versions?.[0]?.question as any)?.answers?.find(
              (q: any) =>
                q.id === (row.original.versions?.[0]?.answer as any).id
            )?.answer_text
          }
        </p>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      enableSorting: true,
      cell: ({ row }) => row.original.category?.title,
    },
    {
      header: "Answers",
      cell: ({ row }) =>
        (row.original.versions?.at(0)?.question as any)?.answers.length,
    },
  ];

  if (isAdmin && mode !== "modal") {
    tableColumns.push({
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onDeleteQuestion(row.original.id)}
            className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ),
    });
  }

  const adminTable = useAdminTable<AllQuestionsForListFragment>({
    columns: tableColumns,
    data: questionsQuery.data?.questions || [],
    rowSelect: mode === "modal" ? () => {} : undefined,
    pageCount: Math.ceil(
      (questionsQuery.data?.questions_aggregated[0].count?.id || 0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: questionsQuery.loading,
    totalItems: questionsQuery.data?.questions_aggregated[0].count?.id || 0,
    rowSelection: [rowSelection, setRowSelection],
    onRowClick: async (row: AllQuestionsForListFragment) => {
      if (mode !== "modal") {
        await modal.show({
          title: `${isAdmin ? "Edit" : "View"} Question`,
          children: (onClose) => (
            <QuestionModal
              question={row}
              onClose={onClose}
              userRole={auth.currentUser?.role as UserRole}
            />
          ),
        });
      }
    },
  });

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  const getSelectedCategory = useMemo(
    () => (rowId?: string) => {
      const id = rowId ? rowId : Object.keys(rowSelection)[0];
      return adminTable.table.getRow(id).original;
    },
    [adminTable.table, rowSelection]
  );

  const onDeleteQuestion = async (id: string) => {
    if (
      await modal.showConfirm("Are you sure you want to delete the Question?")
    ) {
      await updateQuestion({
        variables: {
          id,
          data: {
            status: DirectusStatus.ARCHIVED,
          },
        },
        refetchQueries: ["getAllQuestions", "questionsTotalPages"],
        onCompleted: () => {
          notify(GENERIC_SUCCESS_DELETED);
        },
      });
    }
  };

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SearchInput placeholder="Search Question" onChange={setSearchQuery} />
        <SelectFilter
          options={categoryOptions}
          onChange={(e) => setCategory(e)}
        />
      </div>
      {mode !== "modal" && isAdmin && (
        <div className="mt-8 flex justify-end">
          <Button
            label="New Question"
            classes="md:col-start-2 md:w-56 md:place-self-end"
            iconLeft={faCirclePlus}
            onClick={async () => {
              await modal.show({
                title: "Create a new Question",
                disableClickOutside: true,
                children: (onClose) => (
                  <QuestionModal
                    userRole={auth.currentUser?.role as UserRole}
                    onClose={onClose}
                  />
                ),
              });
            }}
          />
        </div>
      )}
      <div className="md:h-[560px] ">
        <adminTable.Component />
      </div>
      {mode === "modal" && (
        <div className="mt-3 flex justify-end md:mt-6">
          <Button
            label="Add selected Questions to Exam"
            disabled={Object.keys(rowSelection).length === 0}
            onClick={() => {
              if (onSelect) {
                const ids = Object.keys(rowSelection).map(
                  (rowId) => getSelectedCategory(rowId).id
                );
                onSelect(ids);
              }
            }}
          />
        </div>
      )}
    </>
  );
};
