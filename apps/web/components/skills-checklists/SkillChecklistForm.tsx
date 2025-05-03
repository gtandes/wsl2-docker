import {
  faCircleCheck,
  faPlusCircle,
} from "@fortawesome/pro-regular-svg-icons";
import { Input } from "../Input";
import Select from "../Select";
import { Textarea } from "../Textarea";
import Button from "../Button";
import { Combobox } from "../Combobox";
import { Spinner } from "../Spinner";
import { UseFormReturn } from "react-hook-form";
import { SkillChecklistFormValues } from "../../hooks/skill-checklist/useSkillChecklistForm";
import { DirectusStatus } from "types";
import { Toggle } from "../Toggle";

interface SkillChecklistFormProps {
  isNew: boolean;
  loading: boolean;
  canEdit: boolean;
  form: UseFormReturn<SkillChecklistFormValues>;
  onSubmit: (data: SkillChecklistFormValues) => Promise<void>;
  agenciesOptions: { label: string; value: string }[];
  statusOptions: { label: string; value: string }[];
  expirationOptions: { label: string; value: string }[];
  modalities: any[];
  specialties: any[];
  subSpecialties: any[];
  modalitySearchQuery: string;
  specialtySearchQuery: string;
  subSpecialtySearchQuery: string;
  setModalitySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSpecialtySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSubSpecialtySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isLoading?: boolean;
  isNewFormatEnabled?: boolean;
}

export function SkillChecklistForm({
  isNew,
  loading,
  canEdit,
  form,
  onSubmit,
  agenciesOptions,
  statusOptions,
  expirationOptions,
  modalities,
  specialties,
  subSpecialties,
  modalitySearchQuery,
  specialtySearchQuery,
  subSpecialtySearchQuery,
  setModalitySearchQuery,
  setSpecialtySearchQuery,
  setSubSpecialtySearchQuery,
  isLoading,
  isNewFormatEnabled,
}: SkillChecklistFormProps) {
  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <form
      className="mt-10 flex flex-col gap-5"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Input
          register={form.register("title")}
          placeholder="Enter title"
          label="Title"
          disabled={!canEdit}
          required
          error={form.formState.errors.title}
        />
        <Select
          register={form.register("agency")}
          options={agenciesOptions}
          label="Agency"
          disabled={!canEdit}
        />
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Select
          register={form.register("status")}
          label="Status"
          options={statusOptions}
          disabled={
            isNew ||
            form.getValues("status") === DirectusStatus.PUBLISHED ||
            !canEdit
          }
          error={form.formState.errors.status}
        />
        <Combobox
          disabled={!canEdit}
          options={modalities}
          control={form.control}
          name="category"
          query={modalitySearchQuery}
          setQuery={setModalitySearchQuery}
          getLabel={(val) => val?.title || ""}
          by="id"
          label="Cat 1 - Modality"
          required
        />
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Combobox
          options={specialties}
          disabled={!canEdit}
          control={form.control}
          name="specialty"
          query={specialtySearchQuery}
          setQuery={setSpecialtySearchQuery}
          getLabel={(val) => val?.title || ""}
          by="id"
          label="Cat 2 - Speciality (optional)"
        />
        <Combobox
          options={subSpecialties}
          disabled={!canEdit}
          control={form.control}
          name="sub_speciality"
          query={subSpecialtySearchQuery}
          setQuery={setSubSpecialtySearchQuery}
          getLabel={(val) => val?.title || ""}
          by="id"
          label="Cat 3 - Sub speciality (optional)"
        />
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Textarea
          label="Description"
          placeholder="Enter Description"
          disabled={!canEdit}
          register={form.register("description")}
          error={form.formState.errors.description}
          classes="w-full"
        />
        <Select
          label="Expiration"
          options={expirationOptions}
          register={form.control.register("expiration")}
          required
        />
      </div>
      {isNewFormatEnabled && (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Toggle
            control={form.control}
            name="is_new_format"
            label={<p className="text-sm font-medium">New Format</p>}
          />
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          label={isNew ? "Create" : "Save changes"}
          iconLeft={isNew ? faPlusCircle : faCircleCheck}
          loading={loading}
          disabled={!canEdit}
        />
      </div>
    </form>
  );
}
