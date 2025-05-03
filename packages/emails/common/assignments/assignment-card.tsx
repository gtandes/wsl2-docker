// @ts-nocheck
import * as React from "react";
import { Column, Img, Link, Row, Section, Text } from "@react-email/components";

interface AssignmentCardProps {
  competency: {
    category: string;
    title: string;
    type: string;
    assigned_on: string;
    allowed_attempts?: number;
    attempts_used?: number;
    competency_link: string;
    icon_url: string;
  };
}

export const AssignmentCard = ({ competency }: AssignmentCardProps) => {
  return (
    <Section className="py-5 px-6 rounded-lg my-4" style={{ boxShadow: "5px 5px 20px 0px rgba(0, 0, 0, 0.15)" }}>
      <Row>
        <Column className="w-[90px] align-top">
          <Img src={competency.icon_url} width="70" height="70" alt={`${competency.type} icon`} className="my-0" />
        </Column>
        <Column className="pr-3">
          <Text className="text-red-400 font-bold m-0 text-[14px]">{competency.category}</Text>
          <Text className="text-gray-700 font-bold text-[20px] m-0 mt-1">{competency.title}</Text>
          <Text className="text-gray-500 text-[12px] m-0">Assigned: {competency.assigned_on}</Text>
        </Column>
        <Column align="right" className="hidden sm:block">
          <Link
            href={competency.competency_link}
            className="block bg-green-100 text-green-800 font-bold text-center w-[90px] py-2 rounded text-[14px]"
          >
            Start
          </Link>
          {competency.allowed_attempts ? (
            <Text className="text-[12px] text-gray-500 m-0 mt-1">
              Attempts: {competency.attempts_used ?? 0}/{competency.allowed_attempts}
            </Text>
          ) : null}
        </Column>
      </Row>
      <Row className="mt-6 table sm:hidden">
        <Column align="right">
          <Link
            href={competency.competency_link}
            className="block bg-green-100 text-green-800 font-bold text-center w-[180px] py-2 rounded text-[14px]"
          >
            Start
          </Link>
          {competency.allowed_attempts ? (
            <Text className="text-[12px] text-gray-500 m-0 mt-1">
              Attempts: {competency.attempts_used ?? 0}/{competency.allowed_attempts}
            </Text>
          ) : null}
        </Column>
      </Row>
    </Section>
  );
};
