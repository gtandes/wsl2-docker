import { Column, Row, Section } from "@react-email/components";
import * as React from "react";

interface Props {
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  exam: {
    title: string;
    score: number;
    failed_date: string;
    allowed_attempts: string;
    attempts_used: string;
  };
}

export const InvalidExamStats = (props: Props) => {
  return (
    <Section className="text-gray-600 text-[14px]">
      <Row>
        <Column className="w-[120px]">Name</Column>
        <Column align="left">
          {props.user.first_name} {props.user.last_name}
        </Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px]">Email</Column>
        <Column align="left">{props.user.email}</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px]">Exam</Column>
        <Column align="left">{props.exam.title}</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px]">Date</Column>
        <Column align="left">{props.exam.failed_date}</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px]">Attempts used</Column>
        <Column align="left">
          {props.exam.attempts_used} / {props.exam.allowed_attempts}
        </Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px]">Result</Column>
        <Column align="left">Invalid</Column>
      </Row>
    </Section>
  );
};
