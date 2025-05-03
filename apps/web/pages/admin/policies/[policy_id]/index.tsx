import { v4 as uuidv4 } from "uuid";
import { AdminLayout } from "../../../../components/AdminLayout";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../types/roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeftLong,
  faCircleCheck,
  faPlusCircle,
  faTrash,
} from "@fortawesome/pro-regular-svg-icons";
import { useRouter } from "next/router";
import { useAuth } from "../../../../hooks/useAuth";
import Button from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { FieldError, useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useModal } from "../../../../hooks/useModal";
import Select from "../../../../components/Select";
import {
  useCreatePolicyMutation,
  useDeletePolicyAgenciesMutation,
  useGetAllAgenciesQuery,
  useGetPoliciesCategoriesQuery,
  useGetPolicyDetailQuery,
  useUpdatePolicyMutation,
} from "api";
import {
  GENERIC_ERROR,
  GENERIC_FILE_UPLOAD_ERROR,
  GENERIC_SUCCESS_CREATED,
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../../../components/Notification";
import { fileValidation } from "../../../../utils/validations";
import { Spinner } from "../../../../components/Spinner";
import { first } from "lodash";
import Link from "next/link";
import AdminPanel from "../../../../components/AdminPanel";
import clsx from "clsx";
import { useAgency } from "../../../../hooks/useAgency";
import { faPlayCircle } from "@fortawesome/pro-solid-svg-icons";
import { DirectusStatus } from "types";
import { createFile, updateFile } from "../../../../utils/utils";

const refetchQueries = ["getAllPolicies", "getAllPoliciesTotalItems"];

const validationSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty({ message: "Required" })
    .max(255, { message: "Max 255 characters" }),
  category: z.string().nonempty({ message: "Required" }),
  agency: z.string().optional(),
  document: fileValidation(true),
  documentId: z.string().optional(),
});
type PolicyFormValues = z.infer<typeof validationSchema>;

function PolicyDetails() {
  const router = useRouter();
  const auth = useAuth();
  const { currentAgency } = useAgency();
  const modal = useModal();
  const { policy_id } = router.query;
  const isNew = policy_id === "new";
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const isCredUser = auth.currentUser?.role === UserRole.CredentialingUser;
  const filterPublished = { status: { _eq: DirectusStatus.PUBLISHED } };
  const [loading, setLoading] = useState<boolean>(false);
  const [formValidation, setFormValidation] = useState(validationSchema);
  const [createPolicy] = useCreatePolicyMutation({
    refetchQueries,
  });
  const [updatePolicy] = useUpdatePolicyMutation({
    refetchQueries: ["GetPolicyDetails", ...refetchQueries],
  });
  const [deleteAgencies] = useDeletePolicyAgenciesMutation({ refetchQueries });
  const { data: policyData, loading: policyLoading } = useGetPolicyDetailQuery({
    variables: { policyId: String(policy_id) },
    skip: isNew,
  });

  const categoriesQuery = useGetPoliciesCategoriesQuery();
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
      if (policyData?.policies_by_id?.status !== DirectusStatus.PUBLISHED)
        return false;
      if (isAdmin) return true;
      if (
        isAgencyUser &&
        first(auth.currentUser?.agencies)?.id ===
          first(policyData?.policies_by_id?.agencies)?.agencies_id?.id
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
    policyData?.policies_by_id?.agencies,
    policyData?.policies_by_id?.status,
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(formValidation),
    values: useMemo(() => {
      return {
        name: policyData ? String(policyData?.policies_by_id?.name) : "",
        category: isNew
          ? String(first(categoriesQuery?.data?.categories)?.id)
          : first(policyData?.policies_by_id?.categories)?.categories_id?.id!,
        agency: isNew
          ? isAgencyUser
            ? String(first(agenciesQuery?.data?.agencies)?.id)
            : currentAgency?.id ?? ""
          : first(policyData?.policies_by_id?.agencies)?.agencies_id?.id,
        documentId: isNew ? "" : policyData?.policies_by_id?.document?.id,
        document: [],
      };
    }, [
      policyData,
      isNew,
      categoriesQuery?.data?.categories,
      isAgencyUser,
      agenciesQuery?.data?.agencies,
      currentAgency?.id,
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

    setLoading(true);
    const id = isNew ? uuidv4() : String(policy_id);
    const documentFileId = isNew
      ? uuidv4()
      : String(policyData?.policies_by_id?.document?.id);
    const document = data.document && first(data?.document);
    let documentFile = null;

    if (document) {
      try {
        let file = null;
        const fileForm = new FormData();
        const newFileID = uuidv4();
        fileForm.append("id", newFileID);
        fileForm.append("folder", "d47b3133-9895-4987-82ee-e1db03cea168");
        fileForm.append("file", document);
        if (!isNew && policyData?.policies_by_id?.document) {
          file = await updateFile(documentFileId, fileForm);
        } else {
          file = await createFile(fileForm);
        }
        documentFile = {
          id: file?.id,
          title: file?.filename_download,
          filename_download: file?.filename_download || "",
          storage: "local",
        };
        setValue("documentId", newFileID);
      } catch (e) {
        notify(GENERIC_FILE_UPLOAD_ERROR);
        return;
      }
    }

    const payload = {
      name: data.name,
      agencies: data.agency
        ? [
            {
              ...(!isNew && {
                id: first(policyData?.policies_by_id?.agencies)?.id,
              }),
              policies_id: {
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
                id: first(policyData?.policies_by_id?.categories)?.id,
              }),
              policies_id: {
                id,
              },
              categories_id: { id: data.category },
            },
          ]
        : [],
      ...(document && { document: documentFile }),
    };

    try {
      if (isNew) {
        await createPolicy({
          variables: {
            data: { id: id, status: DirectusStatus.PUBLISHED, ...payload },
          },
          onCompleted: () => {
            notify(GENERIC_SUCCESS_CREATED);
            router.push(`/admin/policies/${id}`);
          },
        });
        setLoading(false);
        return;
      }

      if (!isNew && policyData) {
        if (!data.agency && policyData.policies_by_id?.agencies?.length) {
          await deleteAgencies({
            variables: {
              ids: policyData.policies_by_id?.agencies?.flatMap(
                (a) => a?.id
              ) as string[],
            },
          });
        }
        await updatePolicy({
          variables: {
            id: id,
            data: payload,
          },
          onCompleted: () => {
            notify(GENERIC_SUCCESS_SAVED);
            setValue("document", []);
          },
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error(e);
      notify({
        type: "error",
        title: "Error creating Policy",
        description:
          "Creating policy failed due to a system error. Please try again. Refreshing the page may cause unsaved data to be lost. If the issue persists, save your entries separately and contact support.",
      });
      setLoading(false);
    }
  });

  useEffect(() => {
    // update validation schema to make document optional when is in edit mode
    if (!isNew && policyData) {
      setFormValidation(
        validationSchema.setKey("document", fileValidation(!documentId))
      );
    }
  }, [policyData, documentId, isNew]);

  return (
    <AdminLayout>
      {policyLoading ? (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Link
              href="/admin/policies"
              className="mb-8 inline-block text-sm font-medium text-gray-600"
            >
              <FontAwesomeIcon icon={faArrowLeftLong} className="mr-2" /> Back
              to List
            </Link>
            {canEdit && (
              <div className="mb-6 flex flex-col sm:mb-8">
                <Button
                  type="submit"
                  label={isNew ? "Create" : "Save changes"}
                  iconLeft={isNew ? faPlusCircle : faCircleCheck}
                  loading={loading}
                  onClick={onSubmit}
                  classes="w-64"
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
                  router.push(`/admin/policies/${documentId}/preview`);
                }}
              />
            )}
          </div>
          <AdminPanel>
            <form>
              <fieldset disabled={!canEdit}>
                <div className="border-b border-gray-100 pb-6">
                  <h1 className="text-lg font-medium">
                    {isNew ? "Create a new" : "Edit"} Policy
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
                    register={register("name")}
                    label="Title"
                    required
                    error={errors.name}
                  />
                  <Select
                    register={register("category")}
                    label="Category"
                    required
                    options={
                      categoriesQuery.data
                        ? categoriesQuery.data?.categories.map((item) => ({
                            label: item.title as string,
                            value: item.id,
                            selected: item.id === watch("category"),
                          }))
                        : []
                    }
                    error={errors.category}
                  />
                  <Select
                    register={register("agency")}
                    label="Agency"
                    required
                    options={agencyOptions}
                    classes={clsx(
                      "mt-1",
                      (isAgencyUser || isCredUser) && "hidden"
                    )}
                    error={errors.agency}
                  />

                  {auth.currentUser?.role !== UserRole.UsersManager && (
                    <Input
                      label="Document"
                      type="file"
                      register={register("document")}
                      error={errors.document as FieldError}
                      required
                      classes="mt-1"
                      leftComponent={
                        documentId && (
                          <>
                            <a
                              href={`/cms/assets/${documentId}`}
                              className="w-22 flex whitespace-nowrap text-sm text-gray-500 underline"
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
                  )}
                </div>
              </fieldset>
            </form>
          </AdminPanel>
        </>
      )}
    </AdminLayout>
  );
}

export default withAuth(PolicyDetails, AdminGroup);
