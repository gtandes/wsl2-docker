import { buildClientSchema, IntrospectionQuery } from "graphql";
import { withScalars } from "apollo-link-scalars";
import introspectionResult from "./generated/graphql.schema.json";
import { typesMap } from "./parsers";

const schema = buildClientSchema(
  introspectionResult as unknown as IntrospectionQuery,
);

export const scalarLink = withScalars({
  schema,
  typesMap,
});

export * from "./generated/graphql";
