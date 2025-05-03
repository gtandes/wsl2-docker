import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import * as React from "react";
import { TailwindProvider } from "./tailwind-provider";
import { Footer } from "./footer";

export const Base: React.FC<{
  preview: string;
  children: React.ReactNode;
}> = ({ children, preview }) => {
  return (
    <TailwindProvider>
      <Html>
        <Head />
        <Preview>{preview}</Preview>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="my-[40px] mx-auto p-[20px] max-w-3xl">
            <Section>{children}</Section>
            <Footer />
          </Container>
        </Body>
      </Html>
    </TailwindProvider>
  );
};
