import { AdminLayout } from "../../../../components/AdminLayout";
import { SkillChecklistLayout } from "../../../../components/skills-checklists/SkillChecklistLayout";
import { SkillChecklistForm } from "../../../../components/skills-checklists/SkillChecklistForm";
import { useSkillChecklist } from "../../../../hooks/skill-checklist/useSkillChecklistForm";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";

function SkillChecklistPage() {
  const {
    isNew,
    loading,
    canEdit,
    form,
    onSubmit,
    skillChecklistDetailQuery,
    modalities,
    specialties,
    subSpecialties,
    agenciesOptions,
    statusOptions,
    expirationOptions,
    modalitySearchQuery,
    specialtySearchQuery,
    subSpecialtySearchQuery,
    setModalitySearchQuery,
    setSpecialtySearchQuery,
    setSubSpecialtySearchQuery,
    isNewFormatEnabled,
  } = useSkillChecklist();

  return (
    <AdminLayout>
      <h1 className="mb-7 text-2xl font-medium text-blue-800">
        Skills Checklists
      </h1>
      <SkillChecklistLayout
        title={
          isNew
            ? "Create a new skill checklist"
            : (skillChecklistDetailQuery.data?.sc_definitions_by_id
                ?.title as string)
        }
      >
        <SkillChecklistForm
          isNew={isNew}
          loading={loading}
          canEdit={canEdit}
          form={form}
          onSubmit={onSubmit}
          agenciesOptions={agenciesOptions}
          statusOptions={statusOptions}
          expirationOptions={expirationOptions}
          modalities={modalities}
          specialties={specialties}
          subSpecialties={subSpecialties}
          modalitySearchQuery={modalitySearchQuery}
          specialtySearchQuery={specialtySearchQuery}
          subSpecialtySearchQuery={subSpecialtySearchQuery}
          setModalitySearchQuery={setModalitySearchQuery}
          setSpecialtySearchQuery={setSpecialtySearchQuery}
          setSubSpecialtySearchQuery={setSubSpecialtySearchQuery}
          isLoading={skillChecklistDetailQuery.loading}
          isNewFormatEnabled={isNewFormatEnabled}
        />
      </SkillChecklistLayout>
    </AdminLayout>
  );
}

export default withAuth(SkillChecklistPage, AdminGroup);
