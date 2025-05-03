import { Control, useController, useForm } from "react-hook-form";
import { AdminLayout } from "../../../components/AdminLayout";
import { Input } from "../../../components/Input";
import { AdminSettingsLayout } from "../../../components/admin/settings/SettingsLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/pro-solid-svg-icons";
import Button from "../../../components/Button";
import { Toggle } from "../../../components/Toggle";
// import SemiCircleProgressBar from "react-progressbar-semicircle";
import { useAgency } from "../../../hooks/useAgency";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUpdateAgencyMutation } from "api";
import { notify } from "../../../components/Notification";
import { v4 as uuidv4 } from "uuid";
import { createFile, updateFile } from "../../../utils/utils";
import { FileItem, OneItem } from "@directus/sdk";

const schema = z.object({
  org_name: z.string(),
  enable_certificate_logo: z.boolean(),
  display_logo: z.string(),
  certificate_logo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function SettingsDetails() {
  const globalAgency = useAgency();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingLogo, setLoadingLogo] = useState<boolean>(false);
  const [loadingCertificateLogo, setLoadingCertificateLogo] =
    useState<boolean>(false);
  const [disableCertificateLogo, setDisableCertificateLogo] =
    useState<boolean>(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: useMemo(
      () => ({
        org_name: globalAgency?.currentAgency?.name || "",
        display_logo: globalAgency?.currentAgency?.logo?.src || "",
        certificate_logo:
          globalAgency?.currentAgency?.certificate_logo?.src || "",
        enable_certificate_logo:
          globalAgency?.currentAgency?.enable_certificate_logo || false,
      }),
      [globalAgency]
    ),
  });

  const isAgencySelected = globalAgency.currentAgency?.id ? true : false;

  const [updateAgency] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies"],
  });

  // const licensesQuery = useGetLicensesQuery({
  //   variables: {
  //     id: globalAgency.currentAgency?.id!,
  //   },
  //   skip: !globalAgency.currentAgency?.id,
  // });

  // const totalLicensesUsed =
  //   licensesQuery.data?.agencies_by_id?.directus_users?.length;

  // const licensesLeft = useMemo(() => {
  //   if (!globalAgency.currentAgency?.max_licenses) return 0;
  //   if (!totalLicensesUsed) return 0;

  //   return globalAgency.currentAgency?.max_licenses - totalLicensesUsed;
  // }, [globalAgency.currentAgency?.max_licenses, totalLicensesUsed]);

  // const percentage = useMemo(() => {
  //   if (!globalAgency.currentAgency?.max_licenses) return 0;
  //   if (!totalLicensesUsed) return 0;

  //   return (totalLicensesUsed / globalAgency.currentAgency?.max_licenses) * 100;
  // }, [globalAgency.currentAgency?.max_licenses, totalLicensesUsed]);

  const handleImage = async (
    image: string | undefined,
    recordId: string | undefined
  ): Promise<OneItem<FileItem>> => {
    let result: OneItem<FileItem>;
    if (image) {
      const blob = await fetch(image).then((r) => r.blob());
      const form = new FormData();
      form.append("form", blob, `${uuidv4()}.png`);
      if (recordId) {
        result = await updateFile(recordId, form);
      } else {
        result = await createFile(form);
      }
    }

    return result;
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    const { display_logo, certificate_logo, enable_certificate_logo } = values;
    const logoStored = globalAgency.currentAgency?.logo;
    const certificateStored = globalAgency.currentAgency?.certificate_logo;
    let logoResult: OneItem<FileItem>;
    let certificateLogoResult: OneItem<FileItem>;

    if (display_logo && display_logo !== logoStored?.src) {
      setLoadingLogo(true);
      logoResult = await handleImage(display_logo, logoStored?.id);
      setLoadingLogo(false);
      form.setValue("display_logo", logoStored?.src!);
    }

    if (certificate_logo && certificate_logo !== certificateStored?.src) {
      setLoadingCertificateLogo(true);
      certificateLogoResult = await handleImage(
        certificate_logo,
        certificateStored?.id
      );
      setLoadingCertificateLogo(false);
      form.setValue("certificate_logo", certificateStored?.src!);
    }

    await updateAgency({
      variables: {
        id: globalAgency.currentAgency?.id!,
        data: {
          enable_certificate_logo:
            enable_certificate_logo && !!certificate_logo,
          ...(logoResult?.id && {
            logo: {
              id: logoResult?.id,
            },
          }),
          ...(certificateLogoResult?.id && {
            certificate_logo: {
              id: certificateLogoResult?.id,
            },
          }),
        },
      },
    });

    notify({
      title: "Success",
      description: "Logos updated successfully",
      type: "success",
    });
    setLoading(false);
  };

  useEffect(() => {
    setDisableCertificateLogo(!form.getValues("enable_certificate_logo"));
  }, [form.watch("enable_certificate_logo")]);

  return (
    <AdminLayout>
      <AdminSettingsLayout>
        <div className="flex flex-col gap-7">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col rounded-lg bg-white p-8"
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 text-lg font-medium text-gray-900">
              <h2>Organization Logos</h2>
              {isAgencySelected && (
                <Button
                  type="submit"
                  label="Save Changes"
                  size="sm"
                  loading={loading}
                />
              )}
            </div>
            <div className="flex flex-col justify-between gap-8 px-4 pt-12 lg:flex-row">
              <div className="w-96 pt-2">
                <Input
                  register={form.register("org_name")}
                  label="Organization Name"
                  disabled
                />
              </div>
              <div className="flex flex-col gap-6">
                <label className="text-sm font-medium text-gray-700" htmlFor="">
                  Display Logo
                </label>
                <FileInput
                  control={form.control}
                  name="display_logo"
                  loading={loadingLogo}
                  isAgencySelected={isAgencySelected}
                />
              </div>
              <div className="flex min-w-fit flex-col gap-6">
                <label className="text-sm font-medium text-gray-700" htmlFor="">
                  Certificate Logo
                </label>
                <FileInput
                  control={form.control}
                  name="certificate_logo"
                  loading={loadingCertificateLogo}
                  disabled={disableCertificateLogo}
                  isAgencySelected={isAgencySelected}
                />
                <Toggle
                  label="Enable use for Certificates"
                  name="enable_certificate_logo"
                  control={form.control}
                />
              </div>
            </div>
          </form>
          {/* <div className="flex flex-col gap-5 p-8 bg-white rounded-lg ">
            <h2 className="pb-4 text-lg font-medium text-gray-900 border-b border-gray-200">
              Licenses
            </h2>
            <div className="flex gap-3">
              <div className="flex flex-col px-5 py-4 rounded-lg h-52 w-80 bg-dark-blue-50">
                <span className="text-sm text-black">Total used</span>
                <div className="relative flex items-center justify-center h-full">
                  <SemiCircleProgressBar
                    percentage={percentage}
                    strokeWidth={12}
                    stroke={"#458AEC"}
                    diameter={190}
                  />
                  <div className="absolute flex flex-col items-center justify-center bottom-8">
                    {globalAgency.currentAgency?.max_licenses ? (
                      <>
                        <span className="text-4xl font-medium text-blue-500">
                          {totalLicensesUsed}
                        </span>
                        <span className="text-xs text-blue-900">
                          Of{" "}
                          {globalAgency.currentAgency?.max_licenses ||
                            "Max licenses not set"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs">Max licenses not set</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-5 py-4 rounded-lg h-52 w-80 bg-dark-blue-50">
                <span className="text-sm text-black">Licenses left</span>
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-4xl font-medium text-red-400">
                    {licensesLeft}
                  </span>
                  <span className="font-semibold text-red-800 uppercase">
                    REMAINING
                  </span>
                  <span className="text-xs text-red-900">To use</span>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </AdminSettingsLayout>
    </AdminLayout>
  );
}

export default withAuth(SettingsDetails, AdminGroup);

interface FileInputProps extends React.HTMLProps<HTMLInputElement> {
  name: "display_logo" | "certificate_logo";
  control: Control<FormValues>;
  loading: boolean;
  isAgencySelected: boolean;
}

const FileInput: React.FC<FileInputProps> = (props) => {
  const { name, control, loading, isAgencySelected, ...inputProps } = props;

  const controller = useController({
    name,
    control,
  });

  const ref = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const openFilePicker = () => {
    ref.current?.click();
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        setPreviewImage(reader.result as string);
        controller.field.onChange(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const renderImage = () => {
    if (previewImage) {
      return (
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full">
          <img src={previewImage} alt={name} />
        </div>
      );
    }

    if (controller.field.value) {
      return (
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full">
          <img src={`${controller.field.value}`} alt={name} />
        </div>
      );
    }

    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <FontAwesomeIcon icon={faImage} color="#A4A4A4" />
      </div>
    );
  };

  return (
    <div className="flex items-center gap-5">
      {renderImage()}
      <Button
        disabled={inputProps.disabled || !isAgencySelected}
        onClick={openFilePicker}
        variant="outline"
        label="Change"
        loading={loading}
      />
      <input
        accept="image/*"
        name={name}
        onChange={handleFilePick}
        ref={ref}
        type="file"
        className="hidden"
        {...inputProps}
      />
    </div>
  );
};
