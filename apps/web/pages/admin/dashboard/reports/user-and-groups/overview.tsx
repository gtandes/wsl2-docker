import { useState } from "react";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import UserAndGroupsAnalyticsOverview from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsOverviewAnalytics";
import { UserAndGroupsReportsLayout } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsReportsLayout";
import { FilterComboOptions } from "../../../../../components/clinicians/FilterCombo";
import { usePrintMode } from "../../../../../hooks/usePrintMode";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { UserAndGroupsOverviewFilters } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsOverviewFilters";
import { UserAndGroupsFiltersPrint } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsFiltersPrint";

function UserAndGroupsOverview() {
  const { print } = usePrintMode();

  const [filters, setFilters] = useState(); // TODO: Define a type that matches the filters for the competencies

  const [specialtiesFilter, setSpecialtiesFilter] = useState<
    FilterComboOptions[]
  >([]);
  const [departmentsFilter, setDepartmentsFilter] = useState<
    FilterComboOptions[]
  >([]);
  const [locationsFilter, setLocationsFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [supervisorsFilter, setSupervisorsFilter] = useState<
    FilterComboOptions[]
  >([]);

  return (
    <UserAndGroupsReportsLayout>
      <div className="print-content group-overview mb-8 rounded-md bg-white shadow-sm">
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">
              User & Groups Overview Reports
            </h1>
            <FilterComboInfoTooltip />
          </div>
          <div className="noprint">
            <Button
              label="Export PDF/report"
              variant="solid"
              onClick={() => print()}
            />
          </div>
        </div>
        <div className="mb-8">
          <UserAndGroupsOverviewFilters
            setSpecialtiesFilter={setSpecialtiesFilter}
            setDepartmentsFilter={setDepartmentsFilter}
            setLocationsFilter={setLocationsFilter}
            setSupervisorsFilter={setSupervisorsFilter}
            specialtiesFilter={specialtiesFilter}
            departmentsFilter={departmentsFilter}
            locationsFilter={locationsFilter}
            supervisorsFilter={supervisorsFilter}
            setFilters={setFilters}
          />
          <UserAndGroupsAnalyticsOverview filters={filters} />
          <UserAndGroupsFiltersPrint
            specialtiesFilter={specialtiesFilter}
            departmentsFilter={departmentsFilter}
            locationsFilter={locationsFilter}
            supervisorsFilter={supervisorsFilter}
          />
        </div>
      </div>
    </UserAndGroupsReportsLayout>
  );
}

export default withAuth(UserAndGroupsOverview, AdminGroup);
