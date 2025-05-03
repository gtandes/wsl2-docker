import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { AdminLayout } from "../../../../../components/AdminLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../../types/roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeftLong,
  faCircleCheck,
  faTrash,
} from "@fortawesome/pro-regular-svg-icons";
import { useRouter } from "next/router";
import { useAuth } from "../../../../../hooks/useAuth";
import Button from "../../../../../components/Button";
import AdminPanel from "../../../../../components/AdminPanel";
import { Input } from "../../../../../components/Input";
import { FieldError, useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useModal } from "../../../../../hooks/useModal";
import Select from "../../../../../components/Select";
import { Textarea } from "../../../../../components/Textarea";
import {
  CategoryFragment,
  useCreateDocumentMutation,
  useDeleteDocumentAgenciesMutation,
  useGetAllAgenciesQuery,
  useGetAllCategoriesQuery,
  useGetDocumentByIdQuery,
  useUpdateDocumentMutation,
} from "api";
import {
  GENERIC_ERROR,
  GENERIC_FILE_UPLOAD_ERROR,
  NotificationProps,
  notify,
} from "../../../../../components/Notification";
import { directus } from "../../../../../utils/directus";
import { fileValidation } from "../../../../../utils/validations";
import clsx from "clsx";
import { useAgency } from "../../../../../hooks/useAgency";
import { first } from "lodash";
import { faPlayCircle } from "@fortawesome/pro-solid-svg-icons";
import { DirectusStatus } from "types";
import { createFile, updateFile } from "../../../../../utils/utils";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../../types/global";

const DOC_SUCCESS_SAVED: NotificationProps = {
  type: "success",
  title: <>Document saved!</>,
};

const validationSchema = z.object({
  title: z.string().min(1, { message: "Required" }),
  document: fileValidation(true),
  documentId: z.string().optional(),
  category: z.string().min(1, { message: "Required" }),
  agency: z.string().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof validationSchema>;

function DocumentDetail() {
  const router = useRouter();
  const auth = useAuth();
  const { currentAgency } = useAgency();
  const modal = useModal();
  const { document_id } = router.query;
  const isNew = document_id === "new";
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const isCredUser = auth.currentUser?.role === UserRole.CredentialingUser;
  const filterPublished = { status: { _eq: DirectusStatus.PUBLISHED } };
  const [saving, setSaving] = useState<boolean>(false);
  const [formValidation, setFormValidation] = useState(validationSchema);
  const [createDocument] = useCreateDocumentMutation({
    refetchQueries: ["GetAllDocuments"],
  });
  const [updateDocument] = useUpdateDocumentMutation({
    refetchQueries: ["GetDocumentById"],
  });
  const [deleteAgencies] = useDeleteDocumentAgenciesMutation({
    refetchQueries: ["GetAllDocuments"],
  });
  const { data: documentData } = useGetDocumentByIdQuery({
    variables: { id: String(document_id) },
    skip: isNew,
  });

  const categoriesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "document",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        ...(auth.currentUser?.role !== UserRole.HSHAdmin && currentAgency?.id
          ? {
              _or: [
                { agency: { id: { _eq: currentAgency?.id } } },
                { agency: { id: { _null: true } } },
              ],
            }
          : currentAgency?.id && {
              agency: { id: { _eq: currentAgency?.id } },
            }),
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });
  const agenciesQuery = useGetAllAgenciesQuery({
    variables: {
      filter: isAgencyUser
        ? {
            _and: [
              {
                id: { _in: auth.currentUser?.agencies.flatMap((a) => a.id) },
              },
              { ...filterPublished },
            ],
          }
        : filterPublished,
      sort: ["name"],
    },
  });

  const canEdit = useMemo(() => {
    if (isNew) {
      return true;
    } else {
      if (documentData?.documents_by_id?.status !== DirectusStatus.PUBLISHED)
        return false;
      if (isAdmin) return true;
      if (
        isAgencyUser &&
        first(auth.currentUser?.agencies)?.id ===
          first(documentData?.documents_by_id?.agencies)?.agencies_id?.id
      ) {
        return true;
      }

      return false;
    }
  }, [
    auth.currentUser?.agencies,
    isAdmin,
    isAgencyUser,
    isNew,
    documentData?.documents_by_id?.agencies,
    documentData?.documents_by_id?.status,
  ]);

  const findSelectedCategory = (
    categoryId: string
  ): CategoryFragment | undefined =>
    categoriesQuery?.data?.categories.find((c) => c.id === categoryId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formValidation),
    values: useMemo(() => {
      return {
        title: documentData ? String(documentData?.documents_by_id?.title) : "",
        document: [],
        description: documentData
          ? String(documentData?.documents_by_id?.description)
          : "",
        agency: isNew
          ? isAgencyUser
            ? String(agenciesQuery?.data?.agencies?.[0]?.id)
            : currentAgency?.id ?? ""
          : documentData?.documents_by_id?.agencies?.[0]?.agencies_id?.id,
        documentId: isNew ? "" : documentData?.documents_by_id?.document?.id,
        category: isNew
          ? ""
          : !findSelectedCategory(
              documentData?.documents_by_id?.categories?.[0]?.categories_id?.id!
            )
          ? ""
          : documentData?.documents_by_id?.categories?.[0]?.categories_id?.id!,
      };
    }, [
      documentData,
      isNew,
      isAgencyUser,
      agenciesQuery?.data?.agencies,
      currentAgency?.id,
      categoriesQuery?.data?.categories,
    ]),
  });

  const documentId = watch("documentId");
  const agencyOptions = agenciesQuery.data
    ? [
        {
          label: "All agencies",
          value: "",
          selected: !watch("agency"),
        },
        ...agenciesQuery.data?.agencies.map((item) => ({
          label: item.name!,
          value: item.id,
          selected: item.id === watch("agency"),
        })),
      ]
    : [];

  const categoryOptions = useMemo(() => {
    return categoriesQuery.data
      ? [
          {
            label: "Select",
            value: "",
          },
          ...categoriesQuery.data?.categories?.map((c) => ({
            label: c.title || "",
            value: c.id,
          })),
        ]
      : [];
  }, [categoriesQuery]);

  const onClearDocument = async () => {
    const result = await modal.showConfirm(
      `Are you sure you want to remove the document?`
    );

    if (result) {
      setValue("document", []);
      setValue("documentId", "");
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!canEdit) return;

    setSaving(true);
    const id = isNew ? uuidv4() : String(document_id);
    const documentFileId = isNew
      ? uuidv4()
      : String(documentData?.documents_by_id?.document?.id);
    const document = data.document && data?.document[0];
    let documentFile = null;
    if (document) {
      try {
        let file = null;
        const form = new FormData();
        form.append("folder", "55b6d72c-d649-4f23-97d8-b65b7947a0ca");
        form.append("file", document);
        form.append("id", documentFileId);
        if (!isNew && documentData?.documents_by_id?.document) {
          file = await updateFile(documentFileId, form);
        } else {
          file = await createFile(form);
        }
        documentFile = {
          id: file?.id,
          filename_download: file?.filename_download || "",
          storage: "local",
        };
      } catch (e) {
        notify(GENERIC_FILE_UPLOAD_ERROR);
        return;
      }
    }

    const payload = {
      id,
      title: data.title,
      agencies: data.agency
        ? [
            {
              ...(!isNew && {
                id: documentData?.documents_by_id?.agencies?.[0]?.id,
              }),
              documents_id: {
                id,
              },
              agencies_id: { id: data.agency },
            },
          ]
        : [],
      categories: data.category
        ? [
            {
              ...(!isNew && {
                id: documentData?.documents_by_id?.categories?.[0]?.id,
              }),
              documents_id: {
                id,
              },
              categories_id: { id: data.category },
            },
          ]
        : [],
      description: data.description,
      ...(document && { document: documentFile }),
    };

    try {
      if (isNew) {
        await createDocument({
          variables: {
            data: payload,
          },
          onCompleted: () => {
            notify(DOC_SUCCESS_SAVED);
            router.push(`/admin/documents/detail/${id}`);
          },
        });
        setSaving(false);
        return;
      }

      if (!isNew && documentData) {
        if (!data.agency && documentData.documents_by_id?.agencies?.length) {
          await deleteAgencies({
            variables: {
              ids: documentData.documents_by_id?.agencies?.flatMap(
                (a) => a?.id
              ) as string[],
            },
          });
        }
        await updateDocument({
          variables: {
            id,
            data: payload,
          },
          onCompleted: () => {
            notify(DOC_SUCCESS_SAVED);
            setValue("document", []);
            setValue("documentId", documentFileId);
          },
        });
        setSaving(false);
        return;
      }
    } catch (e) {
      notify(GENERIC_ERROR);
    }
  });

  useEffect(() => {
    // update validation schema to make document optional when is in edit mode
    if (!isNew && documentData) {
      setFormValidation(
        validationSchema.setKey("document", fileValidation(!documentId))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentData, documentId]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <Link
          href="/admin/documents"
          className="mb-8 inline-block text-sm font-medium text-gray-600"
        >
          <FontAwesomeIcon icon={faArrowLeftLong} className="mr-2" /> Back to
          List
        </Link>
        {canEdit && (
          <div className="mb-6 flex flex-col sm:mb-8">
            <Button
              label="Save Changes"
              iconLeft={faCircleCheck}
              classes="w-full md:w-64 self-end"
              onClick={onSubmit}
              loading={saving}
            />
          </div>
        )}
      </div>
      <div className="mb-5 flex justify-end">
        {!isNew && (
          <Button
            disabled={auth.currentUser?.role === UserRole.UsersManager}
            variant="light-blue"
            label="Preview"
            iconLeft={faPlayCircle}
            size="sm"
            onClick={() => {
              router.push(`/admin/documents/detail/${document_id}/preview`);
            }}
          />
        )}
      </div>
      <AdminPanel>
        <form>
          <fieldset disabled={!canEdit}>
            <div className="border-b border-gray-100 pb-6">
              <h1 className="text-lg font-medium">
                {isNew ? "Create" : "Edit"} your Document
              </h1>
              {isAdmin && (
                <p className="text-gray-500">
                  Please fill out the information needed and then save and
                  publish.
                </p>
              )}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
              <Input
                label="Title"
                register={register("title")}
                error={errors.title}
                required
                autoFocus
              />
              <Select
                label="Document Category"
                required
                options={categoryOptions}
                register={register("category")}
                classes="mt-1"
                error={errors.category}
              />
              <Select
                label="Agency"
                required
                options={agencyOptions}
                register={agenciesQuery.data ? register("agency") : undefined}
                classes={clsx("mt-1", (isAgencyUser || isCredUser) && "hidden")}
                error={errors.agency}
              />
              {auth.currentUser?.role !== UserRole.UsersManager && (
                <div>
                  <Input
                    label="Document"
                    type="file"
                    register={register("document")}
                    required
                    error={errors.document as FieldError}
                    leftComponent={
                      documentId && (
                        <>
                          <a
                            href={`/cms/assets/${documentId}`}
                            className="flex w-28 text-sm text-gray-500 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Preview file
                          </a>
                          {canEdit && (
                            <FontAwesomeIcon
                              icon={faTrash}
                              className="inline cursor-pointer text-red-500"
                              onClick={onClearDocument}
                            />
                          )}
                        </>
                      )
                    }
                  />
                </div>
              )}
              <Textarea
                label="Description"
                register={register("description")}
                error={errors.description}
                classes="lg:col-span-2"
                rows={3}
              />
            </div>
          </fieldset>
        </form>
      </AdminPanel>
    </AdminLayout>
  );
}

export default withAuth(DocumentDetail, AdminGroup);
