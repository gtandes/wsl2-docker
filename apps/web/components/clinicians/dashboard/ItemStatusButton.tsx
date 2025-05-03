import { useRouter } from "next/router";
import { ClinicianDashboardItems } from "../../../types/global";
import { capitalize } from "lodash";
import Button from "../../Button";
import { CompetencyState } from "types";

export const ItemStatusButton = ({
  item,
}: {
  item: ClinicianDashboardItems;
}) => {
  const router = useRouter();
  let variant: any = "light-blue";

  if (item.status === CompetencyState.NOT_STARTED) {
    variant = "green";
  }
  if (
    item.status === CompetencyState.EXPIRED ||
    item.status === CompetencyState.DUE_DATE_EXPIRED
  ) {
    variant = "light-red";
  }

  return (
    <Button
      label={capitalize(item.status.replaceAll("_", " "))}
      variant={variant}
      onClick={() => router.push(item.link)}
      size="xs"
    />
  );
};
