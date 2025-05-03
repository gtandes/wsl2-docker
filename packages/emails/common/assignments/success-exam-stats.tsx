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
    passed_date: string;
  };
}

export const SuccessExamStats = (props: Props) => {
  return (
    <Section className="text-gray-600 text-[14px] ml-3">
      <Row>
        <Column className="w-[120px] font-semibold">Name</Column>
        <Column align="left">
          {props.user.first_name} {props.user.last_name}
        </Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px] font-semibold">Exam</Column>
        <Column align="left">{props.exam.title}</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px] font-semibold">Date</Column>
        <Column align="left">{props.exam.passed_date}</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px] font-semibold">Score</Column>
        <Column align="left">{props.exam.score} %</Column>
      </Row>
      <Row className="mt-3">
        <Column className="w-[120px] font-semibold">Result:</Column>
        <Column align="left">Pass</Column>
      </Row>
    </Section>
  );
};
