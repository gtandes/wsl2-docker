// How to run
//   Install k6
//   Run "k6 run scripts/load-testing/script.js"
import http from "k6/http";
import { sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "30s", target: 10 },
    { duration: "30s", target: 20 },
    { duration: "30s", target: 30 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 70 },
    { duration: "30s", target: 80 },
    { duration: "30s", target: 90 },
    { duration: "60s", target: 100 },
    { duration: "30s", target: 90 },
    { duration: "30s", target: 80 },
    { duration: "30s", target: 70 },
    { duration: "30s", target: 60 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 30 },
    { duration: "30s", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<200"] },
  noConnectionReuse: true,
  userAgent: "MyK6UserAgentString/1.0",
};

const baseURL = "https://app-stg.hsh.germinate.dev/cms";

export default function () {
  const headers = { "Content-Type": "application/json" };
  const loginPayload = JSON.stringify({
    email: "diana+dc1@germinateapps.com",
    mode: "cookie",
    password: "Test123!",
  });

  let loginRes = http.post(`${baseURL}/auth/login`, loginPayload, { headers: headers });
  const token = loginRes.json("data.access_token");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const payloads = {
    certificates: JSON.stringify({
      operationName: "GetDashboardCertificates",
      variables: {
        limit: 4,
      },
      query:
        'query GetDashboardCertificates($limit: Int) {\n  exams: junction_directus_users_exams(\n    limit: $limit\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_eq: "COMPLETED"}}]}\n    sort: ["-finished_on"]\n  ) {\n    import_cert_url\n    finished_on\n    exams_id {\n      id\n      title\n      __typename\n    }\n    __typename\n  }\n  modules: junction_modules_definition_directus_users(\n    limit: $limit\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_eq: "FINISHED"}, approved: {_eq: true}}]}\n    sort: ["-finished_on"]\n  ) {\n    id\n    import_cert_url\n    finished_on\n    modules_definition_id {\n      title\n      __typename\n    }\n    __typename\n  }\n}',
    }),
    dashboardSummary: JSON.stringify({
      operationName: "GetClinicianDashboardCompetencies",
      variables: {},
      query:
        'query GetClinicianDashboardCompetencies {\n  total_exams: junction_directus_users_exams_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_in: ["NOT_STARTED", "IN_PROGRESS", "FAILED", "EXPIRED", "DUE_DATE_EXPIRED", "COMPLETED"]}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_exams_completed: junction_directus_users_exams_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_in: ["COMPLETED"]}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_modules: junction_modules_definition_directus_users_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_in: ["PENDING", "FINISHED", "STARTED", "DUE_DATE_EXPIRED"]}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_modules_completed: junction_modules_definition_directus_users_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_eq: "FINISHED"}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_skills_checklists: junction_sc_definitions_directus_users_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_in: ["PENDING", "COMPLETED", "DUE_DATE_EXPIRED"]}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_skills_checklists_completed: junction_sc_definitions_directus_users_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {status: {_eq: "COMPLETED"}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_policies: junction_directus_users_policies_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {policies_id: {status: {_eq: "published"}}}, {status: {_neq: "archived"}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_policies_completed: junction_directus_users_policies_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {policies_id: {status: {_eq: "published"}}}, {status: {_neq: "archived"}}, {signed_on: {_nnull: true}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_documents: junction_directus_users_documents_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {documents_id: {status: {_eq: "published"}}}, {status: {_neq: "archived"}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n  total_documents_completed: junction_directus_users_documents_aggregated(\n    filter: {_and: [{directus_users_id: {id: {_eq: "$CURRENT_USER"}}}, {documents_id: {status: {_eq: "published"}}}, {status: {_neq: "archived"}}, {read: {_nnull: true}}]}\n  ) {\n    count {\n      id\n      __typename\n    }\n    __typename\n  }\n}',
    }),
    agencies: JSON.stringify({
      operationName: "getAllAgencies",
      variables: {
        filter: {
          status: {
            _eq: "published",
          },
        },
        sort: ["name"],
      },
      query:
        "query getAllAgencies($offset: Int, $sort: [String], $search: String, $filter: agencies_filter) {\n  agencies(\n    limit: -1\n    offset: $offset\n    sort: $sort\n    search: $search\n    filter: $filter\n  ) {\n    ...Agency\n    __typename\n  }\n}\n\nfragment Agency on agencies {\n  id\n  name\n  custom_allowed_attempts_exams\n  notifications_settings\n  automatic_notifications_email\n  custom_allowed_attempts_modules\n  default_due_date\n  default_expiration\n  max_licenses\n  enable_certificate_logo\n  sc_allow_na_option\n  logo {\n    id\n    filename_download\n    __typename\n  }\n  certificate_logo {\n    id\n    filename_download\n    __typename\n  }\n  __typename\n}",
    }),
  };

  http.batch([
    [
      "GET",
      `${baseURL}/users/me?fields[]=id&fields[]=email&fields[]=first_name&fields[]=last_name&fields[]=role&fields[]=agencies.status&fields[]=agencies.agencies_id.id&fields[]=agencies.status&fields[]=agencies.agencies_id.custom_allowed_attempts_exams`,
      null,
      { headers: authHeaders },
    ],
    ["POST", `${baseURL}/graphql`, payloads.agencies, { headers: authHeaders }],
    ["POST", `${baseURL}/graphql`, payloads.dashboardSummary, { headers: authHeaders }],
    ["POST", `${baseURL}/graphql`, payloads.certificates, { headers: authHeaders }],
  ]);

  sleep(1);
}
