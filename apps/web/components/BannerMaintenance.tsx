import React, { useState } from "react";
import Button from "./Button";
import { useGetAllMaintenanceWindowsQuery } from "api";
import { formatDateTime } from "../utils/format";
import { cn } from "../utils/utils";

interface MaintenanceBannersProps {
  isLogin?: boolean;
}

const DISMISSED_BANNER_KEY = "dismissed-maintenance-windows";

export const MaintenanceBanners: React.FC<MaintenanceBannersProps> = ({
  isLogin = false,
}) => {
  const [dismissedBanners, setDismissedBanners] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const getIds = window.localStorage.getItem(DISMISSED_BANNER_KEY);
    return getIds ? JSON.parse(getIds) : [];
  });

  const maintenanceWindowQuery = useGetAllMaintenanceWindowsQuery();

  const applicableBanners =
    maintenanceWindowQuery.data?.maintenance_windows.filter((window) => {
      return !dismissedBanners.includes(window.id);
    });

  const hideBanner = (id: string) => {
    window.localStorage.setItem(
      DISMISSED_BANNER_KEY,
      JSON.stringify([...dismissedBanners, id])
    );
    setDismissedBanners([...dismissedBanners, id]);
  };

  if (applicableBanners?.length === 0) return null;

  return applicableBanners?.map((window) => (
    <div
      key={window.id}
      className="relative mb-1 flex items-center justify-between rounded-md bg-yellow-50 px-4 pb-2 pt-4"
    >
      <h3 className="py-4 text-sm font-medium text-blue-800">
        We are scheduled for maintenance on{" "}
        {formatDateTime(window.start_date_time || "")}. During this time, our
        web app will be temporarily unavailable. We appreciate your patience and
        understanding as we work to improve your experience. Thank you!
      </h3>
      <Button
        label="✕"
        size="xs"
        variant="link"
        classes={cn(isLogin ? "absolute top-1 right-4 text-blue-800" : "")}
        onClick={() => hideBanner(window.id)}
      />
    </div>
  ));
};
