import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: {
    "http://localhost:3000/cms/graphql": {
      headers: {
        Authorization: `Bearer NtNAXoiAxbgFmN9VlW5mNlvzt5BVjXGG`,
      },
    },
    "http://localhost:3000/cms/graphql/system": {
      headers: {
        Authorization: `Bearer NtNAXoiAxbgFmN9VlW5mNlvzt5BVjXGG`,
      },
    },
  },
  documents: "./queries.graphql",
  generates: {
    "generated/graphql.tsx": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withComponent: false,
        withHooks: true,
        withHOC: false,
        strictScalars: true,
        scalars: {
          Date: "Date",
          GraphQLBigInt: "number",
          GraphQLStringOrFloat: "string | number",
          Hash: "string",
          JSON: "Object",
          Void: "void",
        },
      },
    },
    "generated/graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};
export default config;
