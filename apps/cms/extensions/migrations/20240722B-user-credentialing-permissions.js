const userCredentiallingRoleId = "05bdccb9-dbff-4a45-bfb7-47abe151badb";

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([
      {
        role: userCredentiallingRoleId,
        collection: "agencies",
        action: "create",
        permissions: {},
        validation: {
          id: {
            _in: ["$CURRENT_USER.agencies.agencies_id.id"],
          },
        },
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "agencies",
        action: "read",
        permissions: {
          id: {
            _in: ["$CURRENT_USER.agencies.agencies_id.id"],
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "agencies",
        action: "update",
        permissions: {
          id: {
            _in: ["$CURRENT_USER.agencies.agencies_id.id"],
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "categories",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "categories",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "categories",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "documents",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "documents",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "documents",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies: {
                    id: {
                      _null: true,
                    },
                  },
                },
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_agencies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_agencies",
        action: "delete",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_agencies",
        action: "read",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_agencies",
        action: "update",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_categories",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_categories",
        action: "delete",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_categories",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_documents_categories",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_documents",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_documents",
        action: "update",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exams",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exams",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _null: true,
                      },
                    },
                  },
                },
              ],
            },
            {
              status: {
                _eq: "published",
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exam_versions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exam_versions",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exam_results",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exam_versions",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "questions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "question_versions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_exams",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_exams",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_exams",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_exam_versions_questions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_exams_agencies",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_exams_questions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_exams_categories_specialties",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_exams_categories_subspecialties",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_definitions",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_definitions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_definitions",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_versions",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_versions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "sc_versions",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_agencies",
        action: "create",
        permissions: {},
        validation: {
          id: {
            _in: ["$CURRENT_USER.agencies.agencies_id.id"],
          },
        },
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_agencies",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_directus_users",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_directus_users",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "policies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "policies",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies: {
                    id: {
                      _null: true,
                    },
                  },
                },
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "policies",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_agencies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_agencies",
        action: "read",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_agencies",
        action: "update",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_agencies",
        action: "delete",
        permissions: {
          agencies_id: {
            id: {
              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
            },
          },
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_categories",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_categories",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_categories",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_policies_categories",
        action: "delete",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_files",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_roles",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_users",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_documents",
        action: "read",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_files",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_files",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_definition",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_versions",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_directus_users",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_directus_users",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_directus_users",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_directus_users",
        action: "delete",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_definition",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_exams",
        action: "delete",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "bundles",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "bundles",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agency: {
                    id: {
                      _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                    },
                  },
                },
                {
                  agency: {
                    id: {
                      _null: true,
                    },
                  },
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "bundles",
        action: "update",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_documents",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_documents",
        action: "update",
        permissions: {
          _and: [
            {
              bundles_id: {
                agency: {
                  id: {
                    _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                  },
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_exams",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_exams",
        action: "update",
        permissions: {
          _and: [
            {
              bundles_id: {
                agency: {
                  id: {
                    _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                  },
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_modules_definition",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_modules_definition",
        action: "update",
        permissions: {
          _and: [
            {
              bundles_id: {
                agency: {
                  id: {
                    _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                  },
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_policies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_policies",
        action: "update",
        permissions: {
          _and: [
            {
              bundles_id: {
                agency: {
                  id: {
                    _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                  },
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_sc_definitions",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_sc_definitions",
        action: "update",
        permissions: {
          _and: [
            {
              bundles_id: {
                agency: {
                  id: {
                    _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                  },
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_policies",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_policies",
        action: "read",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_policies",
        action: "update",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_roles",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "specialties",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "specialties",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "specialties",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "departments",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "departments",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "departments",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "locations",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "locations",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "locations",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_supervisors",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_supervisors",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_supervisors",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_specialties",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_specialties",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_specialties",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_locations",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_locations",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_locations",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_departments",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_departments",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_directus_users_agencies_departments",
        action: "update",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_agencies",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "agencies",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_results",
        action: "create",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_results",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_directus_users",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_users",
        action: "create",
        permissions: {},
        validation: {
          _and: [
            {
              role: {
                _nin: ["cd4bfb95-9145-4bad-aa88-a3810f15a976", "cc987fae-dbb9-4d72-8199-21243fa13c92"],
              },
            },
          ],
        },
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "directus_users",
        action: "update",
        permissions: {},
        validation: {
          _and: [
            {
              role: {
                _nin: ["cd4bfb95-9145-4bad-aa88-a3810f15a976", "cc987fae-dbb9-4d72-8199-21243fa13c92"],
              },
            },
          ],
        },
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "exams",
        action: "update",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
              ],
            },
            {
              status: {
                _eq: "published",
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "modules_definition",
        action: "update",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
              ],
            },
            {
              status: {
                _eq: "published",
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_modules_definition_agencies",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  agencies_id: {
                    id: {
                      _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                    },
                  },
                },
                {
                  agencies_id: {
                    id: {
                      _null: true,
                    },
                  },
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "maintenance_windows",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "id,start_date_time,status",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_sc_definitions_directus_users",
        action: "update",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "due_date,expiration_type",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_exams",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  bundles_id: {
                    agency: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  _or: [
                    {
                      exams_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                            },
                          },
                        },
                      },
                    },
                    {
                      exams_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _null: true,
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_documents",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  bundles_id: {
                    agency: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  _or: [
                    {
                      documents_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                            },
                          },
                        },
                      },
                    },
                    {
                      documents_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _null: true,
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_modules_definition",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  bundles_id: {
                    agency: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  _or: [
                    {
                      modules_definition_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                            },
                          },
                        },
                      },
                    },
                    {
                      modules_definition_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _null: true,
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_policies",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  bundles_id: {
                    agency: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  _or: [
                    {
                      policies_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                            },
                          },
                        },
                      },
                    },
                    {
                      policies_id: {
                        agencies: {
                          agencies_id: {
                            id: {
                              _null: true,
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
      {
        role: userCredentiallingRoleId,
        collection: "junction_bundles_sc_definitions",
        action: "read",
        permissions: {
          _and: [
            {
              _or: [
                {
                  bundles_id: {
                    agency: {
                      id: {
                        _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                      },
                    },
                  },
                },
                {
                  _or: [
                    {
                      sc_definitions_id: {
                        agency: {
                          agencies_id: {
                            id: {
                              _null: true,
                            },
                          },
                        },
                      },
                    },
                    {
                      sc_definitions_id: {
                        agency: {
                          agencies_id: {
                            id: {
                              _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
    ]);
  },

  async down() {},
};
