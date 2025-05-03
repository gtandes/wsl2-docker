import { query } from "../utils/utils";
import { Input } from "./Input";
import { z } from "zod";
import { BullhornToggle } from "./clinicians/BullhornToggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import { useAgency } from "../hooks/useAgency";
import { Spinner } from "./Spinner";

interface ChecklistOption {
  value: string;
  label: string;
}

interface ChecklistStatusMappingProps {
  isChecklistEnabled: boolean;
  isDisabled?: boolean;
}

const schema = z.object({
  checklist_enable: z.boolean(),
  dynamicFields: z.record(z.string()),
});

type FormValues = z.infer<typeof schema>;

const CheckListStatusMapping: FC<ChecklistStatusMappingProps> = ({
  isChecklistEnabled,
  isDisabled,
}) => {
  const { currentAgency } = useAgency();
  const [fields, setFields] = useState<ChecklistOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const { control, watch, register, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      checklist_enable: isChecklistEnabled,
      dynamicFields: {},
    },
  });

  useEffect(() => {
    reset({ checklist_enable: isChecklistEnabled });
  }, [isChecklistEnabled, reset]);

  const watchChecklistEnable = watch("checklist_enable");

  const fetchAndUpdateChecklistStatus = useCallback(async () => {
    if (!currentAgency?.id) return;

    setLoading(true);

    try {
      const response = await query(
        `/cms/integration/bullhorn/checklist-status-valueset`,
        "POST",
        {
          agency_id: currentAgency.id,
          checklist_enable: watchChecklistEnable,
        }
      );

      if (!response.ok) throw new Error("Failed to fetch or update data");

      const data = (await response.json()) as { options: ChecklistOption[] };

      if (data.options.length > 0) {
        setFields(data.options);
        const updatedFields = data.options.reduce<Record<string, string>>(
          (acc, item) => ({ ...acc, [item.value]: item.label }),
          {}
        );
        setValue("dynamicFields", updatedFields);
      } else {
        setFields([]);
        setValue("dynamicFields", {});
      }
    } catch (error) {
      console.error("Failed to fetch or update checklist status:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id, setValue, watchChecklistEnable]);

  const debouncedFetchAndUpdateChecklistStatus = useMemo(
    () => debounce(fetchAndUpdateChecklistStatus, 500),
    [fetchAndUpdateChecklistStatus]
  );

  const handleChecklistToggle = (checked: boolean) => {
    setValue("checklist_enable", checked);
    debouncedFetchAndUpdateChecklistStatus();
  };

  useEffect(() => {
    debouncedFetchAndUpdateChecklistStatus();

    return () => {
      debouncedFetchAndUpdateChecklistStatus.cancel();
    };
  }, [watchChecklistEnable, debouncedFetchAndUpdateChecklistStatus]);

  return (
    <div className="my-3 border-t border-gray-300 pt-4">
      <div className="flex items-center">
        <h3 className="md:text-2xs mr-3 md:font-semibold">
          Checklist status in Bullhorn
        </h3>
        <BullhornToggle
          disabled={isDisabled}
          label="Enable Checklist"
          value={watchChecklistEnable}
          onChange={handleChecklistToggle}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {fields.map((field) => (
            <div key={field.value} className="flex-1">
              <Input
                required
                readOnly
                type="text"
                register={register(`dynamicFields.${field.value}`)}
                label={field.label}
              />
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        You need to add these field values to the Value List of the selected
        Bullhorn Candidate as well.
      </p>
    </div>
  );
};

export default CheckListStatusMapping;
