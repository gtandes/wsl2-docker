import Head from "next/head";
import React from "react";

export const MainLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <>
      <Head>
        <title>HSH</title>
        <meta name="description" content="HSH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen antialiased">{children}</div>
    </>
  );
};
