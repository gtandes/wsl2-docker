import React from "react";
import { setContext } from "@apollo/client/link/context";
import { directus } from "../utils/directus";
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  from,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { scalarLink } from "api";
import { onError } from "@apollo/client/link/error";
import { GENERIC_ERROR, notify } from "./Notification";
// import { SentryLink } from "apollo-link-sentry";

interface Props {
  children: React.ReactNode;
}

const asyncAuthLink = setContext(
  () =>
    new Promise(async (resolve) => {
      try {
        await directus.auth.refreshIfExpired();
        const token = await directus.auth.token;

        const headers = {
          Authorization: token ? `Bearer ${token}` : null,
        };

        resolve({ headers });
      } catch (error) {
        resolve({});
      }
    })
);

const directusHttpLink = new HttpLink({
  uri: "/cms/graphql",
  fetch,
});

const directusSystemHttpLink = new HttpLink({
  uri: "/cms/graphql/system",
  fetch,
});

const httpLink = ApolloLink.split(
  (op) => {
    return op.operationName.toLowerCase().startsWith("sys");
  },
  directusSystemHttpLink,
  directusHttpLink
);

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      if (message.includes("permission") || message.includes("forbidden")) {
        notify({
          type: "error",
          title: "Permission Error",
          description:
            "You don't have a permission to access this resource. Try logging back in.",
        });
      } else {
        notify({
          type: "error",
          title: "An unexpected error occurred.",
          description: (
            <>
              Try refreshing the page. If you continue to see this message,
              please log out and log back in. If the problem persists, reach out
              to support with details of the action you were performing.
            </>
          ),
        });
      }
    });
    return;
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
  }
  console.log(`Other Errors`);
  notify(GENERIC_ERROR);
});

// const sentryLink = new SentryLink();

const client = new ApolloClient({
  link: from([asyncAuthLink, scalarLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NEXT_PUBLIC_ENV_NAME !== "prod",
});

export const ApolloClientProvider: React.FC<Props> = (props) => {
  return <ApolloProvider client={client}>{props.children}</ApolloProvider>;
};
