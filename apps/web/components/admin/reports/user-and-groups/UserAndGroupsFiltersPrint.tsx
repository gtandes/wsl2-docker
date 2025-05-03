import { FilterComboOptions } from "../../../clinicians/FilterCombo";

interface UserAndGroupsFiltersPrintProps {
  specialtiesFilter: FilterComboOptions[];
  departmentsFilter: FilterComboOptions[];
  locationsFilter: FilterComboOptions[];
  supervisorsFilter: FilterComboOptions[];
}

export const UserAndGroupsFiltersPrint: React.FC<
  UserAndGroupsFiltersPrintProps
> = ({
  departmentsFilter,
  locationsFilter,
  specialtiesFilter,
  supervisorsFilter,
}) => {
  const thereAreFilters =
    specialtiesFilter.length > 0 ||
    departmentsFilter.length > 0 ||
    locationsFilter.length > 0 ||
    supervisorsFilter.length > 0;

  return thereAreFilters ? (
    <div className="mt-8 hidden print:block">
      <h1 className="mb-5 hidden text-center text-2xl print:block">
        Filters Applied
      </h1>
      {specialtiesFilter.length > 0 && (
        <div>
          <span className="font-semibold">Specialties: </span>{" "}
          {specialtiesFilter.map((f) => f.label).toString()}
        </div>
      )}
      {departmentsFilter.length > 0 && (
        <div>
          <span className="font-semibold">Department: </span>{" "}
          {departmentsFilter.map((f) => f.label).toString()}
        </div>
      )}
      {locationsFilter.length > 0 && (
        <div>
          <span className="font-semibold">Location: </span>{" "}
          {locationsFilter.map((f) => f.label).toString()}
        </div>
      )}
      {supervisorsFilter.length > 0 && (
        <div>
          <span className="font-semibold">Supervisors: </span>{" "}
          {supervisorsFilter.map((f) => f.label).toString()}
        </div>
      )}
    </div>
  ) : null;
};
