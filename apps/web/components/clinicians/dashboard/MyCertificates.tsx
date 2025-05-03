import {
  faArrowCircleRight,
  faBadgeCheck,
} from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useGetDashboardCertificatesQuery } from "api";
import Link from "next/link";
import { Spinner } from "../../Spinner";
import { useMemo } from "react";

type CertificateType = {
  title: string;
  finished_on: Date;
  cert_url: string;
  external_link: boolean;
};

export const MyCertificates = () => {
  const { data, loading } = useGetDashboardCertificatesQuery({
    variables: { limit: 4 },
  });

  const certificates = useMemo(() => {
    const examsCertificates = data?.exams.length
      ? data?.exams?.map((e) => ({
          title: e.exams_id?.title,
          finished_on: e.finished_on,
          external_link: !!e.import_cert_url,
          cert_url:
            e.import_cert_url || `/clinician/exams/${e?.id}/certificate`,
        }))
      : [];
    const modulesCertificates = data?.modules.length
      ? data?.modules?.map((m) => ({
          title: m.modules_definition_id?.title,
          finished_on: m.finished_on,
          external_link: !!m.import_cert_url,
          cert_url:
            m.import_cert_url || `/clinician/modules/${m.id}/certificate`,
        }))
      : [];

    return [...examsCertificates, ...modulesCertificates]
      ?.sort(
        (a, b) =>
          new Date(b.finished_on!).getTime() -
          new Date(a.finished_on!).getTime()
      )
      .slice(0, 4) as CertificateType[];
  }, [data]);

  return (
    <>
      {loading ? (
        <div className="flex w-full items-center justify-center p-5">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-auto p-5  md:overflow-hidden">
          <div className="flex justify-between">
            <h2 className="mb-5 text-base font-medium text-black">
              My Certificates
            </h2>
            <Link
              href="/clinician/competencies"
              className="text-base font-medium text-blue-800"
            >
              <div className="flex gap-2">
                View all
                <span className="text-md text-blue-800">
                  <FontAwesomeIcon icon={faArrowCircleRight} />
                </span>
              </div>
            </Link>
          </div>
          <div className="flex flex-col gap-5 lg:flex-row">
            {certificates.length > 0 &&
              certificates.map((c, i) => (
                <Link
                  key={i}
                  href={c.cert_url}
                  target={c.external_link ? "_blank" : "_self"}
                  className="flex w-full cursor-pointer  items-start justify-between gap-5 rounded-lg bg-[#F4F6FB] px-[14px] py-[16px] lg:w-1/2 "
                >
                  <p className="text-lg font-medium text-gray-900">{c.title}</p>
                  <span className="text-2xl text-blue-800">
                    <FontAwesomeIcon icon={faBadgeCheck} />
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </>
  );
};
