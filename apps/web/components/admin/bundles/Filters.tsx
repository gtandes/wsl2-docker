import { useEffect, useState } from "react";
import { FilterCombo, FilterComboOptions } from "../../clinicians/FilterCombo";
import { useGetAllCategoriesQuery } from "api";
import { DirectusStatus, CategoryType } from "types";
import { useDebounce } from "usehooks-ts";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

interface FiltersProps {
  setFilters: (filters: Array<Record<string, any>>) => void;
}

const debouncedTime = 500;

export const Filters: React.FC<FiltersProps> = ({ setFilters }) => {
  const [modalityFilters, setModalityFilters] = useState<FilterComboOptions[]>(
    []
  );
  const [specialityFilters, setSpecialityFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [subSpecialityFilters, setSubSpecialityFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [documentFilters, setDocumentFilters] = useState<FilterComboOptions[]>(
    []
  );
  const [policyFilters, setPolicyFilters] = useState<FilterComboOptions[]>([]);

  const [modalitySearchQuery, setModalitySearchQuery] = useState("");
  const [specialitySearchQuery, setSpecialitySearchQuery] = useState("");
  const [subSpecialitySearchQuery, setSubSpecialitySearchQuery] = useState("");
  const [documentsSearchQuery, setDocumentsSearchQuery] = useState("");
  const [policySearchQuery, setPolicySearchQuery] = useState("");

  const debouncedModalitySearchQuery = useDebounce(
    modalitySearchQuery,
    debouncedTime
  );
  const debouncedSpecialitySearchQuery = useDebounce(
    specialitySearchQuery,
    debouncedTime
  );
  const debouncedSubSpecialitySearchQuery = useDebounce(
    subSpecialitySearchQuery,
    debouncedTime
  );
  const debouncedDocumentsSearchQuery = useDebounce(
    documentsSearchQuery,
    debouncedTime
  );
  const debouncedPolicySearchQuery = useDebounce(
    policySearchQuery,
    debouncedTime
  );

  const modalitiesQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedModalitySearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        type: {
          _eq: CategoryType.MODALITY,
        },
      },
    },
  });

  const specialityQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedSpecialitySearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        type: {
          _eq: CategoryType.SPECIALITY,
        },
      },
    },
  });

  const subSpecialityQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedSubSpecialitySearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        type: {
          _eq: CategoryType.SUB_SPECIALITY,
        },
      },
    },
  });

  const documentsQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedDocumentsSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        type: {
          _eq: CategoryType.DOCUMENT,
        },
      },
    },
  });

  const policyQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedPolicySearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        type: {
          _eq: CategoryType.POLICY,
        },
      },
    },
  });

  const modalitiesOptions = modalitiesQuery.data?.categories.map(
    (modality) => ({
      label: modality.title,
      value: modality.id,
    })
  ) as FilterComboOptions[];
  const specialityOptions = specialityQuery.data?.categories.map(
    (speciality) => ({
      label: speciality.title,
      value: speciality.id,
    })
  ) as FilterComboOptions[];
  const subSpecialityOptions = subSpecialityQuery.data?.categories.map(
    (subSpeciality) => ({
      label: subSpeciality.title,
      value: subSpeciality.id,
    })
  ) as FilterComboOptions[];
  const documentsOptions = documentsQuery.data?.categories.map((document) => ({
    label: document.title,
    value: document.id,
  })) as FilterComboOptions[];
  const policyOptions = policyQuery.data?.categories.map((policy) => ({
    label: policy.title,
    value: policy.id,
  })) as FilterComboOptions[];

  useEffect(() => {
    if (
      [
        ...modalityFilters,
        ...specialityFilters,
        ...subSpecialityFilters,
        ...documentFilters,
        ...policyFilters,
      ].length > 0
    ) {
      const filters = [];

      if (modalityFilters.length > 0) {
        filters.push(
          ...[
            {
              exams: {
                exams_id: {
                  modality: {
                    id: {
                      _in: modalityFilters.map((m) => m.value),
                    },
                  },
                },
              },
            },
            {
              modules: {
                modules_definition_id: {
                  modality: {
                    id: {
                      _in: modalityFilters.map((m) => m.value),
                    },
                  },
                },
              },
            },
            {
              skills_checklists: {
                sc_definitions_id: {
                  category: {
                    id: {
                      _in: modalityFilters.map((m) => m.value),
                    },
                  },
                },
              },
            },
          ]
        );
      }

      if (specialityFilters.length > 0) {
        filters.push(
          ...[
            {
              exams: {
                exams_id: {
                  specialties: {
                    categories_id: {
                      id: {
                        _in: specialityFilters.map((s) => s.value),
                      },
                    },
                  },
                },
              },
            },
            {
              modules: {
                modules_definition_id: {
                  specialty: {
                    id: {
                      _in: specialityFilters.map((s) => s.value),
                    },
                  },
                },
              },
            },
            {
              skills_checklists: {
                sc_definitions_id: {
                  speciality: {
                    id: {
                      _in: specialityFilters.map((s) => s.value),
                    },
                  },
                },
              },
            },
          ]
        );
      }

      if (subSpecialityFilters.length > 0) {
        filters.push(
          ...[
            {
              exams: {
                exams_id: {
                  subspecialties: {
                    categories_id: {
                      id: {
                        _in: subSpecialityFilters.map((s) => s.value),
                      },
                    },
                  },
                },
              },
            },
            {
              modules: {
                modules_definition_id: {
                  sub_specialty: {
                    id: {
                      _in: subSpecialityFilters.map((s) => s.value),
                    },
                  },
                },
              },
            },
            {
              skills_checklists: {
                sc_definitions_id: {
                  sub_speciality: {
                    id: {
                      _in: subSpecialityFilters.map((s) => s.value),
                    },
                  },
                },
              },
            },
          ]
        );
      }

      if (documentFilters.length > 0) {
        filters.push(
          ...[
            {
              documents: {
                documents_id: {
                  categories: {
                    categories_id: {
                      id: {
                        _in: documentFilters.map((d) => d.value),
                      },
                    },
                  },
                },
              },
            },
          ]
        );
      }

      if (policyFilters.length > 0) {
        filters.push(
          ...[
            {
              policies: {
                policies_id: {
                  categories: {
                    categories_id: {
                      id: {
                        _in: policyFilters.map((p) => p.value),
                      },
                    },
                  },
                },
              },
            },
          ]
        );
      }

      setFilters(filters);
    } else {
      setFilters([]);
    }
  }, [
    documentFilters,
    modalityFilters,
    policyFilters,
    setFilters,
    specialityFilters,
    subSpecialityFilters,
  ]);

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <FilterCombo
          placeholder="Filter by Modality"
          options={modalitiesOptions}
          filters={modalityFilters}
          filterKey="label"
          setFilters={setModalityFilters}
          setDebounced={setModalitySearchQuery}
        />
      </div>
      <div>
        <FilterCombo
          placeholder="Filter by Speciality"
          options={specialityOptions}
          filters={specialityFilters}
          filterKey="label"
          setFilters={setSpecialityFilters}
          setDebounced={setSpecialitySearchQuery}
        />
      </div>
      <div>
        <FilterCombo
          placeholder="Filter by Sub Speciality"
          options={subSpecialityOptions}
          filters={subSpecialityFilters}
          filterKey="label"
          setFilters={setSubSpecialityFilters}
          setDebounced={setSubSpecialitySearchQuery}
        />
      </div>
      <div>
        <FilterCombo
          placeholder="Filter by Document Category"
          options={documentsOptions}
          filters={documentFilters}
          filterKey="label"
          setFilters={setDocumentFilters}
          setDebounced={setDocumentsSearchQuery}
        />
      </div>
      <div>
        <FilterCombo
          placeholder="Filter by Policy Category"
          options={policyOptions}
          filters={policyFilters}
          filterKey="label"
          setFilters={setPolicyFilters}
          setDebounced={setPolicySearchQuery}
        />
      </div>
    </div>
  );
};
