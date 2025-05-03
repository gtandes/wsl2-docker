import { z } from "zod";
import { BullhornToggle } from "./clinicians/BullhornToggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect } from "react";
import { useUpdateAgencyMutation } from "api";
import { GENERIC_ERROR, notify } from "./Notification";
import { useAgency } from "../hooks/useAgency";

interface EnableBullhornProps {
  isBullhornEnabled: boolean;
}

const schema = z.object({
  bullhorn_enable: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EnableBullhorn: FC<EnableBullhornProps> = ({ isBullhornEnabled }) => {
  const { currentAgency } = useAgency();
  const { watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      bullhorn_enable: isBullhornEnabled,
    },
  });

  const [updateAgency] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies"],
  });

  const handleBhIntegration = async (enabled: boolean) => {
    if (!currentAgency) return;

    try {
      await updateAgency({
        variables: {
          id: currentAgency?.id!,
          data: {
            bh_enable: enabled,
          },
        },
      });

      const action = enabled ? "enabled" : "disabled";
      notify({
        type: "success",
        title: `Bullhorn Integration ${action}`,
        description: `The Bullhorn integration has been ${action} successfully.`,
      });
      // setIsBhEnabled(enabled);
    } catch (error) {
      notify(GENERIC_ERROR);
    }
  };

  useEffect(() => {
    reset({ bullhorn_enable: isBullhornEnabled });
  }, [isBullhornEnabled, reset]);

  const watchChecklistEnable = watch("bullhorn_enable");

  return (
    <div className="border-gray-300">
      <div className="flex items-center">
        <h3 className="md:text-2xs mr-3 md:font-semibold">
          Activate Bullhorn Integration
        </h3>
        <BullhornToggle
          label=""
          value={watchChecklistEnable}
          onChange={handleBhIntegration}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Toggle the switch to enable or disable Bullhorn integration. Disabling
        it will prevent access to all Bullhorn integration features.
      </p>
    </div>
  );
};

export default EnableBullhorn;
