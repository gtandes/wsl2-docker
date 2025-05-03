import React from "react";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { MainLayout } from "../components/MainLayout";
import { AuthProvider } from "../hooks/useAuth";
import { Rubik } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { QueryParamProvider } from "use-query-params";
import NextAdapterPages from "next-query-params/pages";
import { ModalProvider } from "../hooks/useModal";
import { Toaster } from "react-hot-toast";
import { AgencyProvider } from "../hooks/useAgency";
import { FeatureFlagsProvider } from "../hooks/useFeatureFlags";
import { ApolloClientProvider } from "../components/ApolloProvider";
import { IntegrityAdvocateProvider } from "../hooks/useIntegrityAdvocate";

config.autoAddCss = false;

export const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${rubik.variable} font-sans`}>
      <Toaster position="top-right" />
      <QueryParamProvider adapter={NextAdapterPages}>
        <ApolloClientProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              <AgencyProvider>
                <ModalProvider>
                  <MainLayout>
                    <IntegrityAdvocateProvider>
                      <Component {...pageProps} />
                    </IntegrityAdvocateProvider>
                  </MainLayout>
                </ModalProvider>
              </AgencyProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
        </ApolloClientProvider>
      </QueryParamProvider>
      <style jsx global>{`
        :root {
          --font-rubik: ${rubik.style.fontFamily};
        }
      `}</style>
      <script
        defer
        data-domain="app.healthcarestaffinghire.com"
        src={`https://stats${
          ["prod", "sandbox"].includes(process.env.NEXT_PUBLIC_ENV_NAME!)
            ? ""
            : "-stg"
        }.germinate.dev/js/script.js`}
      ></script>
    </main>
  );
}
