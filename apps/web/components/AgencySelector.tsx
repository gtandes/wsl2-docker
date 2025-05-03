import Select, { SelectOption } from "./Select";
import { useAgency } from "../hooks/useAgency";
import { useAuth } from "../hooks/useAuth";
import { AllRoles, UserRole } from "../types/roles";
import { useRouter } from "next/router";

const AllAgenciesOption = {
  label: "All Agencies",
  value: "all",
  selected: false,
};

const RoutesWithoutAgencySelector = [
  "/admin/users/[user_id]/profile",
  "/admin/users/[user_id]/competencies",
  "/admin/agencies",
  "/admin/mappings",
  "/admin/agencies/billing",
];

export default function AgencySelector() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { loaded, currentAgency, agencies, setCurrentAgencyById } = useAgency();

  if (!currentUser || currentUser?.role !== UserRole.HSHAdmin) return null;

  let agencyOptions: SelectOption[] = [];
  if (loaded && agencies?.length) {
    const ags = agencies?.map((agency) => ({
      label: String(agency.name),
      value: agency.id,
      selected: agency.id === currentAgency?.id,
    }));
    agencyOptions = [AllAgenciesOption, ...ags];
  }

  return (
    <div className="w-60 md:w-48">
      <p className="text-xs font-medium">View as agency</p>
      <Select
        id="options-agency"
        disabled={RoutesWithoutAgencySelector.includes(router.pathname)}
        options={agencyOptions}
        onChange={(e) => setCurrentAgencyById(e.target.value)}
      />
    </div>
  );
}
