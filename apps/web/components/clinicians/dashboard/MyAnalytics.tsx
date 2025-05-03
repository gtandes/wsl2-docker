import { useGetClinicianDashboardAnalyticsQuery } from "api";
import SemiCircleProgressBar from "react-progressbar-semicircle";
import { Spinner } from "../../Spinner";
import { useMemo } from "react";

type Analytics = {
  examPercentage: number;
  examCeus: number;
  modulePercentage: number;
  moduleCeus: number;
  examStatusRgba: string;
  examStatusColor: string;
  moduleStatusRgba: string;
  moduleStatusColor: string;
};

export const MyAnalytics = () => {
  const { data, loading } = useGetClinicianDashboardAnalyticsQuery();

  const getPercentageColors = (
    percentage: number
  ): { rgba: string; color: string } => {
    let statusRgba = "rgba(18, 183, 119, 1)";
    let statusColor = "text-green-500";
    if (percentage >= 70 && percentage < 80) {
      statusRgba = "rgba(255, 124, 92, 1)";
      statusColor = "text-red-400";
    }
    if (percentage < 70) {
      statusRgba = "rgba(193, 54, 20, 1)";
      statusColor = "text-red-700";
    }
    return {
      rgba: statusRgba,
      color: statusColor,
    };
  };

  const analytics = useMemo<Analytics>(() => {
    const examPercentage = Number(data?.exam_avg[0].avg?.score) || 0;
    const modulePercentage = Number(data?.module_avg[0].avg?.score) || 0;
    const examCeus =
      data?.exam_ceus.reduce(
        (acc, curr) => acc + Number(curr?.exam_versions_id?.contact_hour),
        0
      ) || 0;
    const moduleCeus =
      data?.module_ceus.reduce(
        (acc, curr) =>
          acc + Number(curr?.modules_definition_id?.last_version?.contact_hour),
        0
      ) || 0;

    const examColors = getPercentageColors(examPercentage);
    const moduleColors = getPercentageColors(modulePercentage);

    return {
      examPercentage,
      examCeus,
      modulePercentage,
      moduleCeus,
      examStatusRgba: examColors.rgba,
      examStatusColor: examColors.color,
      moduleStatusRgba: moduleColors.rgba,
      moduleStatusColor: moduleColors.color,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-3 p-5 ">
      {loading ? (
        <div className="m-auto">
          <Spinner />
        </div>
      ) : (
        <>
          <h2 className="text-base font-medium text-black">Exam Analytics</h2>
          <div className="flex flex-col items-center gap-5 md:flex-row">
            <div className="w-full bg-blue-50 p-5 md:w-1/2 ">
              <span className="font-medium">Average Score</span>
              <div
                className={`flex flex-col items-center justify-center gap-3 ${
                  analytics.examPercentage >= 80 ? "py-3" : "py-7"
                }`}
              >
                <SemiCircleProgressBar
                  percentage={analytics.examPercentage}
                  strokeWidth={15}
                  stroke={analytics.examStatusRgba}
                  diameter={250}
                />
                <span
                  className={`-mt-16 text-4xl font-extrabold ${analytics.examStatusColor}`}
                >
                  {analytics.examPercentage.toFixed()} %
                </span>
                <span
                  className={`text-sm font-bold ${analytics.examStatusColor}`}
                >
                  Avg Score
                </span>
                {analytics.examPercentage >= 80 && (
                  <span
                    className={`text-sm font-bold ${analytics.examStatusColor}`}
                  >
                    GREAT JOB!
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-blue-50 p-5 md:w-1/2">
              <span className="font-medium">CEUs Earned</span>
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span className="text-2xl font-bold text-blue-500 md:text-5xl">
                  {analytics.examCeus} CEUs
                </span>
                <span className="text-sm font-bold text-blue-500">Total</span>
                <span className="text-xl font-bold text-blue-500">
                  WAY TO GO!
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-base font-medium text-black">Module Analytics</h2>
          <div className="flex flex-col items-center gap-5 md:flex-row">
            <div className="w-full bg-blue-50 p-5 md:w-1/2 ">
              <span className="font-medium">Average Score</span>
              <div
                className={`flex flex-col items-center justify-center gap-3 ${
                  analytics.modulePercentage >= 80 ? "py-3" : "py-7"
                }`}
              >
                <SemiCircleProgressBar
                  percentage={analytics.modulePercentage}
                  strokeWidth={15}
                  stroke={analytics.moduleStatusRgba}
                  diameter={250}
                />
                <span
                  className={`-mt-16 text-4xl font-extrabold ${analytics.moduleStatusColor}`}
                >
                  {analytics.modulePercentage.toFixed()} %
                </span>
                <span
                  className={`text-sm font-bold ${analytics.moduleStatusColor}`}
                >
                  Avg Score
                </span>
                {analytics.modulePercentage >= 80 && (
                  <span
                    className={`text-sm font-bold ${analytics.moduleStatusColor}`}
                  >
                    GREAT JOB!
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-blue-50 p-5 md:w-1/2">
              <span className="font-medium">CEUs Earned</span>
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span className="text-2xl font-bold text-blue-500 md:text-5xl">
                  {analytics.moduleCeus} CEUs
                </span>
                <span className="text-sm font-bold text-blue-500">Total</span>
                <span className="text-xl font-bold text-blue-500">
                  WAY TO GO!
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
