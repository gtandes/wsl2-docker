import React from "react";
import Image from "next/image";
import Button from "../Button";

import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import { usePrintMode } from "../../hooks/usePrintMode";
import { formatDate, formatExpiresOnDate } from "../../utils/format";
import clsx from "clsx";
import LineUp from "../../assets/cert/line-up.png";
import LineDown from "../../assets/cert/line-down.png";
import RectangleUP from "../../assets/cert/rectangle-up.png";
import RectangleDown from "../../assets/cert/rectangle-down.png";
import AnccLogo from "../../assets/ANCC-logo.png";
import { Agencies } from "api";
import { isBefore } from "date-fns";
import { Logo } from "../utils/Logo";
import { useRouter } from "next/router";

interface Props {
  title: string;
  passingScore: number;
  certificateCode: string | number;
  grantedOn: string;
  validUntil: string;
  fullName: string;
  category: string;
  ceu: string;
  agency: Agencies;
  type: "Exam" | "Module";
}

export const Certificate: React.FC<Props> = ({
  title,
  passingScore,
  certificateCode,
  grantedOn,
  validUntil,
  fullName,
  ceu,
  agency,
  type,
}) => {
  const { print } = usePrintMode();
  const router = useRouter();
  const isExpired = validUntil
    ? isBefore(new Date(validUntil), Date.now())
    : false;
  return (
    <>
      <div
        className={clsx("noprint my-3 flex align-middle", "justify-between")}
      >
        <Button
          iconLeft={faArrowLeft}
          label="Back"
          variant="link"
          onClick={() => router.back()}
        />
        <Button label="Download" variant="solid" onClick={() => print()} />
      </div>
      <div className="certificate relative m-auto flex bg-white lg:w-3/5">
        <div className="absolute">
          <Image alt="rectangle up" src={RectangleUP} />
        </div>
        <div className="absolute">
          <Image alt="line up" src={LineUp} />
        </div>
        <div className="absolute bottom-0 right-0">
          <Image alt="rectangle down" src={RectangleDown} />
        </div>
        <div className="absolute bottom-0 right-0">
          <Image alt="line down" src={LineDown} />
        </div>
        {isExpired && (
          <div className="absolute top-[40%] w-full -rotate-45 text-center text-3xl text-gray-600 opacity-20 md:text-5xl">
            THIS CERTIFICATE HAS EXPIRED <br />
            ON : {formatDate(validUntil)}
          </div>
        )}
        <div className="m-3 flex w-full flex-col items-center gap-4 border-8 border-solid border-[#030773] p-3 print:gap-5 print:!p-2 md:p-10">
          <Logo />

          {agency?.certificate_logo?.id && agency.enable_certificate_logo ? (
            <Image
              width={120}
              height={120}
              alt={agency?.name!}
              src={`${window.origin}/cms/assets/${agency?.certificate_logo?.id}`}
            />
          ) : (
            <div className="py-12">
              <span className="rounded-md bg-yellow-100 px-5 py-1 text-sm font-medium text-yellow-900">
                {agency.name}
              </span>
            </div>
          )}

          <h1 className="mb-2 text-center text-[26px] font-bold uppercase print:text-[22px]">
            Certificate of Completion
          </h1>
          <span className="text-sm text-black">This is to certify that</span>
          <h2 className="text-center text-[32px] font-bold italic text-[#314E85] print:text-[22px]">
            {fullName}
          </h2>
          <hr className="w-7/12 border-2 border-solid border-[#314E85]" />
          <p className="w-8/12 text-center">
            has successfully completed the online {type}:
          </p>
          <h2 className="py-5 text-center text-[32px] font-bold text-[#3E598C] print:text-[22px]">
            {title}
          </h2>
          <div className="w-full text-center">
            <h3 className="text-xl font-bold text-[#314E85] print:text-lg">
              Percentage {passingScore}%
            </h3>
            <p className="mx-auto w-9/12 text-center">
              Healthcare Staffing Hire is accredited as a provider of nursing
              continuing professional development by the American Nurses
              Credentialing Center’s Commission on Accreditation.
            </p>
          </div>

          <div className="m-0 flex flex-wrap justify-center gap-5 text-center md:text-start">
            <div>
              <p>
                Granted by:{" "}
                <span className="font-bold">Healthcare Staffing Hire</span>
              </p>
              <p>
                Certificate code:{" "}
                <span className="font-bold">{certificateCode}</span>
              </p>
              <p>
                {" "}
                Provider number: <span className="font-bold">P0669</span>
              </p>
            </div>
            <div>
              <p>
                Granted on:{" "}
                <span className="font-bold">{formatDate(grantedOn)}</span>
              </p>
              {validUntil && (
                <p>
                  Expires On:
                  <span className="font-bold">
                    {" " + formatExpiresOnDate(validUntil)}
                  </span>
                </p>
              )}
              <p>
                Contact Hour(s):{" "}
                <span className="font-bold">{ceu} Hour(s)</span>
              </p>
            </div>
          </div>
          <Image width={81} height={81} alt="Ancc Logo" src={AnccLogo} />
          <p>www.healthcarestaffinghire.com</p>
        </div>
      </div>
    </>
  );
};
