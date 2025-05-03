import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UserRole } from "../types/roles";
import { useAuth } from "./useAuth";
import { Agencies, Agencies_Filter, useGetAllAgenciesQuery } from "api";
import { Agency, NotificationsSettings } from "../types/global";
import { first } from "lodash";
import { ExpirationType } from "types";
import { query } from "../utils/utils";
import { useFeatureFlags } from "./useFeatureFlags";

interface ContextProps {
  agencies?: Agency[];
  currentAgency?: Agency;
  activitySettings?: ActivitySetting[];
  loaded: boolean;
  setCurrentAgencyById: (id: string) => Promise<void>;
}

interface ActivitySetting {
  Activity_Id: string;
  Enabled: string;
}

const AuthContext = createContext<ContextProps>({} as ContextProps);

export function useAgency() {
  return useContext(AuthContext);
}

export function useCurrentOrGlobalAgency() {
  const auth = useAuth();

  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const globalAgency = useContext(AuthContext);

  if (isAgencyUser) {
    return first(auth.currentUser?.agencies) as Agency;
  } else {
    return globalAgency.currentAgency;
  }
}

export const AgencyProvider: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const [currentAgency, setCurrentAgency] = useState<Agency>();
  const [agencies, setAgencies] = useState<Agency[]>();
  const [loaded, setLoaded] = useState(false);
  const { currentUser } = useAuth();
  const [activitySettings, setActivitySettings] = useState<ActivitySetting[]>(
    []
  );
  const { flags } = useFeatureFlags();

  const agencyFilter = useMemo<Agencies_Filter>(() => {
    const publishdFilter = { status: { _eq: "published" } };
    let filter: Agencies_Filter = publishdFilter;
    if (
      currentUser?.role !== UserRole.HSHAdmin &&
      currentUser?.agencies.length
    ) {
      filter = {
        _and: [publishdFilter, { id: { _eq: currentUser.agencies[0].id } }],
      };
    }
    return filter;
  }, []);

  const fetchActivitySettings = async (agencyId: string) => {
    try {
      const response = await query(
        `/cms/integrity-advocate/activity-settings?agencyId=${agencyId}`,
        "GET"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result: { activitySettings: ActivitySetting[] } =
        await response.json();

      if (result.activitySettings) {
        setActivitySettings(result.activitySettings);
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const { data: agenciesData } = useGetAllAgenciesQuery({
    variables: {
      filter: agencyFilter,
      sort: ["name"],
    },
    skip: currentUser === undefined,
  });

  const mapAgency = (agency: Agencies): Agency => ({
    id: agency.id,
    name: String(agency.name),
    custom_allowed_attempts_exams:
      agency.custom_allowed_attempts_exams as number,
    custom_allowed_attempts_modules:
      agency.custom_allowed_attempts_modules as number,
    notifications_settings:
      agency.notifications_settings as NotificationsSettings,
    automatic_notifications_email: agency.automatic_notifications_email ?? null,
    default_expiration: agency.default_expiration as ExpirationType,
    default_due_date: agency.default_due_date as number,
    max_licenses: agency.max_licenses ?? null,
    sc_allow_na_option: !!agency.sc_allow_na_option,
    self_assigment_allow: !!agency.self_assigment_allow,
    logo: {
      id: agency.logo?.id,
      src: agency.logo
        ? `${window.origin}/cms/assets/${agency.logo?.id}`
        : null,
    },
    certificate_logo: {
      id: agency.certificate_logo?.id,
      src: agency.certificate_logo
        ? `${window.origin}/cms/assets/${agency.certificate_logo?.id}`
        : null,
    },
    enable_certificate_logo: agency.enable_certificate_logo,
    webhook_enable: agency.webhook_enable,
    webhook_url: agency.webhook_url,
    webhook_token: agency.webhook_token,
    webhook_secret: agency.webhook_secret,
    ia_enable: agency.ia_enable,
    ia_app_id: agency.ia_app_id,
    ia_api_key: agency.ia_api_key,
    bh_enable: agency.bh_enable,
  });

  useEffect(() => {
    try {
      if (agenciesData?.agencies) {
        const agencyOptions = agenciesData?.agencies?.map((agency) =>
          mapAgency(agency as Agencies)
        );

        if (currentUser?.role !== UserRole.HSHAdmin) {
          const currentAgency = agencyOptions?.find(
            (agency) => agency.id === currentUser?.agencies[0].id
          );

          if (currentAgency) {
            setCurrentAgency(currentAgency);
            setAgencies([currentAgency]);
            localStorage.setItem("agency", JSON.stringify(currentAgency));

            if (
              flags["enabled_integrity_advocate"] &&
              currentAgency.ia_enable &&
              currentAgency.ia_app_id
            ) {
              fetchActivitySettings(currentAgency.id);
            }
          }

          return;
        }
        setAgencies(agencyOptions);
        const currentAgency = JSON.parse(
          localStorage.getItem("agency") || "{}"
        );
        if (currentAgency) {
          const agency = agencyOptions?.find(
            (agency) => agency.id === currentAgency.id
          );
          setCurrentAgency(agency);
        }
      }
    } catch (error) {
      setCurrentAgency(undefined);
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.agencies, currentUser?.role, agenciesData?.agencies, flags]);

  const setCurrentAgencyById = useCallback(
    async (id: string) => {
      const agency = agencies?.find((agency) => agency.id === id);
      if (agency) {
        setCurrentAgency(agency);
        localStorage.setItem("agency", JSON.stringify(agency));
      } else {
        localStorage.removeItem("agency");
        setCurrentAgency(undefined);
      }
    },
    [agencies]
  );

  const value = React.useMemo<ContextProps>(
    () => ({
      agencies,
      currentAgency,
      setCurrentAgencyById,
      loaded,
      activitySettings,
    }),
    [agencies, currentAgency, setCurrentAgencyById, loaded, activitySettings]
  );

  return <AuthContext.Provider value={value} {...props} />;
};
