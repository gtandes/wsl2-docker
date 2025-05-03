import {
  Body,
  Tailwind,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
} from "@react-email/components";
import * as React from "react";
import { Footer } from "./footer";

interface BaseAgencyEmailProps {
  children: React.ReactNode;
  previewText: string;
  agency: {
    name: string;
    logo: string;
  };
}

export const BaseAgencyEmail = (props: BaseAgencyEmailProps) => {
  const baseUrl = process.env["WEB_URL"];

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>{props.previewText}</Preview>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="my-[40px] mx-auto p-[20px] max-w-3xl">
            <Section className="mt-[32px]">
              <Row>
                {props.agency.logo ? (
                  <Column align="left" className="w-[80px] mr-3">
                    <Img
                      src={`${baseUrl}/cms/assets/${props.agency.logo}`}
                      width="100"
                      alt={`${props.agency.name} logo`}
                      className="my-0"
                    />
                  </Column>
                ) : (
                  <Column align="left">
                    <Heading className="text-gray-800 text-[24px] font-bold p-0">{props.agency.name}</Heading>
                  </Column>
                )}
              </Row>
            </Section>
            <Section>{props.children}</Section>
            <Footer />
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};
