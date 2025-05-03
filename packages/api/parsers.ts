import { FunctionsMap, ParsingFunctionsObject } from "apollo-link-scalars";

const DateTimeParser: ParsingFunctionsObject<Date | null, string> = {
  serialize: (parsed) => {
    if (parsed instanceof Date) return parsed.toISOString();
    throw new Error("Unexpected type");
  },
  parseValue: (raw) => {
    if (typeof raw !== "string") throw new Error("Unexpected type");
    return new Date(raw);
  },
};

export const typesMap: FunctionsMap = {
  DateTime: DateTimeParser,
  Date: DateTimeParser,
};
