import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SkillChecklistFragment,
  useCreateSkillChecklistMutation,
  useUpdateSkillChecklistMutation,
} from "api";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useAgency } from "../../hooks/useAgency";
import Button from "../Button";
import { Input } from "../Input";
import { notify, GENERIC_SUCCESS_CREATED } from "../Notification";
import Select from "../Select";

interface CloneSkillChecklistModalProps {
  checklist: SkillChecklistFragment;
  onClose: () => void;
}

const schema = z.object({
  title: z.string(),
  agency: z.string(),
});

type Form = z.infer<typeof schema>;

export const CloneSkillChecklistModal: React.FC<
  CloneSkillChecklistModalProps
> = ({ onClose, checklist }) => {
  const router = useRouter();
  const globalAgency = useAgency();
  const form = useForm<Form>({
    defaultValues: {
      title: `${checklist.title} (Clone)`,
    },
    resolver: zodResolver(schema),
  });

  const [createSkillChecklist] = useCreateSkillChecklistMutation();
  const [updateSkillChecklistMutation] = useUpdateSkillChecklistMutation();

  const handleClone = async () => {
    const formValues = form.getValues();

    if (!checklist) throw new Error("Missing checklist");

    const checklistDefinitionCreationResult = await createSkillChecklist({
      variables: {
        data: {
          title: formValues.title,
          category: {
            id: checklist.category?.id,
          },
          ...(checklist.speciality && {
            speciality: { id: checklist.speciality.id },
          }),
          ...(checklist.sub_speciality && {
            sub_speciality: { id: checklist.sub_speciality.id },
          }),
          status: checklist.status,
          versions: [
            {
              agreements: checklist.last_version?.agreements,
              instructions: checklist.last_version?.instructions,
              total_questions: checklist.last_version?.total_questions,
              description: checklist.last_version?.description,
              expiration: checklist.last_version?.expiration,
              questions: checklist.last_version?.questions,
            },
          ],
          agency: [
            {
              agencies_id: {
                id: formValues.agency,
              },
            },
          ],
          original_item_definition: {
            id: checklist.id,
          },
          original_item_version: {
            id: checklist.last_version?.id,
          },
        },
      },
    });

    const definition =
      checklistDefinitionCreationResult.data?.create_sc_definitions_item;

    const lastVersion = definition?.versions?.[0];

    if (!definition) throw new Error("Missing SC definition");
    if (!lastVersion?.id) throw new Error("Missing SC versions");

    await updateSkillChecklistMutation({
      variables: {
        id: definition.id,
        data: {
          last_version: {
            id: lastVersion.id,
          },
        },
      },
    });

    router.push(`/admin/skills-checklists/${definition.id}`);
    notify(GENERIC_SUCCESS_CREATED);
  };

  const agenciesOptions = useMemo(() => {
    if (!globalAgency.agencies) return [];

    const agencies = globalAgency.agencies
      .filter((a) => a.id !== checklist.agency?.at(0)?.agencies_id?.id)
      .map((agency) => ({
        label: agency.name,
        value: agency.id,
      }));

    return agencies;
  }, [checklist.agency, globalAgency.agencies]);

  return (
    <div className="flex flex-col gap-4">
      <Input required register={form.register("title")} label="Title" />
      <Select
        required
        register={form.register("agency")}
        options={agenciesOptions}
        label="Agency"
      />
      <div className="mt-4 flex justify-end gap-3">
        <Button label="Cancel" onClick={() => onClose()} variant="outline" />
        <Button
          label="Clone"
          onClick={async () => {
            await handleClone();
            onClose();
          }}
        />
      </div>
    </div>
  );
};
