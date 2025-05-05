import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../../components/clinicians/DashboardLayout";
import { withAuth } from "../../../hooks/withAuth";
import { ClinicianGroup } from "../../../types/roles";
import { ContentTypeList } from "../../../components/clinicians/ContentTypeList";
import {
  useGetAllCategoriesQuery,
  UserExamsFragment,
  useSysUsersExamsQuery,
} from "api";
import { useAuth } from "../../../hooks/useAuth";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBallotCheck } from "@fortawesome/pro-solid-svg-icons";
import Button from "../../../components/Button";
import { useRouter } from "next/router";
import { statusOptions } from "../../../components/exams/StatusOptions";
import {
  formatDateTime,
  formatExpiresOnDate,
  getFormattedDueDate,
} from "../../../utils/format";
import { CompetencyState, DirectusStatus } from "types";
import { openExternalLink } from "../../../utils/utils";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { Badge } from "../../../components/Badge";
import { ExamResumeTimer } from "../../../components/clinicians/exams/ExamResumeTimer";
import { useAgency } from "../../../hooks/useAgency";
import { CUSTOM_MESSAGE, notify } from "../../../components/Notification";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

const useServerTimeSync = () => {
  const [serverClientTimeOffset, setServerClientTimeOffset] = useState(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  useEffect(() => {
    // Function to fetch server time and calculate offset
    const syncTime = async () => {
      try {
        const response = await fetch(`/api/v1/exams/server-time`);
        if (!response.ok) throw new Error("Failed to fetch server time");

        const data = await response.json();
        const serverTime = new Date(data.timestamp).getTime();
        const clientTime = Date.now();
        const offset = serverTime - clientTime;

        setServerClientTimeOffset(offset);
        setIsTimeSynced(true);
        console.log(`Time synced with server. Offset: ${offset}ms`);
      } catch (error) {
        console.error("Error syncing time with server:", error);
        // Use 0 as fallback offset if server is unreachable
        setIsTimeSynced(true);
      }
    };

    syncTime();

    // Optional: refresh time sync periodically for long sessions
    const intervalId = setInterval(syncTime, 3600000); // Refresh every hour
    return () => clearInterval(intervalId);
  }, []);

  // Function to get accurate time
  const getAccurateTime = () => {
    return Date.now() + serverClientTimeOffset;
  };

  return { getAccurateTime, isTimeSynced };
};

function ClinicianExams() {
  const auth = useAuth();
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const { currentAgency, activitySettings } = useAgency();
  const [statusFilters, setStatusFilters] = useState<FilterComboOptions[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<FilterComboOptions[]>(
    []
  );

  const { getAccurateTime, isTimeSynced } = useServerTimeSync();

  const modalitiesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "modality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });

  const modalityOptions = modalitiesQuery.data?.categories.map((c) => ({
    label: c.title,
    value: c.id,
  }));

  const examsQuery = useSysUsersExamsQuery({
    variables: {
      userFilters: {
        id: {
          _eq: auth.currentUser?.id!,
        },
      },
      examFilters: {
        status: {
          _in: statusFilters.length
            ? statusFilters.map((f) => f.value as CompetencyState)
            : statusOptions.map((o) => o.value as CompetencyState),
        },
        agency: {
          _and: [
            { directus_users: { status: { _eq: DirectusStatus.ACTIVE } } },
            {
              directus_users: {
                directus_users_id: { id: { _eq: auth.currentUser?.id! } },
              },
            },
          ],
        },
      },
    },
    skip: !auth.currentUser?.id,
  });

  const exams = examsQuery.data?.users.at(0)?.exams;

  const getReportCallbackData = (e: UserExamsFragment) => {
    let reportCallback = () => {};
    let disabledReport = false;

    const isImported = !!e.import_subscription_id;

    if (isImported && e.import_report_url) {
      reportCallback = () => openExternalLink(e.import_report_url!);
    }

    if (isImported && !e.import_report_url) {
      disabledReport = true;
    }

    if (!isImported) {
      reportCallback = () => router.push(`/clinician/exams/${e?.id}/result`);
    }

    return { reportCallback, disabledReport, isImported };
  };

  const handleTimeUp = async (examId: string) => {
    try {
      router.reload();
    } catch (error) {
      console.error("Failed to refetch exams:", error);
    }
  };

  function renderButtons(e: UserExamsFragment) {
    const isProctored =
      e?.exams_id?.exam_versions?.at(0)?.is_proctoring && e?.agency?.ia_enable;
    const isIAEnabled = flags["enabled_integrity_advocate"];

    switch (e.status) {
      case CompetencyState.DUE_DATE_EXPIRED:
        return <Button label="Due Date Expired" variant="light-red" disabled />;
      case CompetencyState.EXPIRED:
        let { reportCallback: expiredReport, disabledReport: expiredDisabled } =
          getReportCallbackData(e);

        return (
          <Button
            variant="light-gray"
            label="Expired"
            disabled={expiredDisabled}
            onClick={expiredReport}
          />
        );
      case CompetencyState.FAILED:
        let { reportCallback: failedReport, disabledReport: failedDisabled } =
          getReportCallbackData(e);

        return (
          <Button
            variant="light-red"
            label="Failed"
            disabled={failedDisabled}
            onClick={failedReport}
          />
        );
      case CompetencyState.IN_REVIEW:
        return <Button variant="light-blue" label="Proctoring Review" />;
      case CompetencyState.INVALID:
        return <Button variant="light-red" label="Invalid" />;
      case CompetencyState.COMPLETED:
        let certCallback = () => {};
        let disabledCertificate = false;
        let {
          reportCallback: completedReport,
          disabledReport: completedDisabled,
          isImported,
        } = getReportCallbackData(e);

        if (isImported && e.import_cert_url) {
          certCallback = () => openExternalLink(e.import_cert_url!);
        }

        if (isImported && !e.import_cert_url) {
          disabledCertificate = true;
        }

        if (!isImported) {
          certCallback = () =>
            router.push(`/clinician/exams/${e?.id}/certificate`);
        }

        return (
          <div className="flex flex-col gap-2">
            {!disabledCertificate && (
              <Button
                variant="light-green"
                label="View Certificate"
                onClick={certCallback}
              />
            )}
            <Button
              variant="green"
              label={e.score ? `Passed ${e.score}%` : "Passed"}
              disabled={completedDisabled}
              onClick={completedReport}
            />
          </div>
        );
      case CompetencyState.IN_PROGRESS:
        const canResume =
          e.attempt_due && isTimeSynced
            ? new Date(e.attempt_due).getTime() > getAccurateTime()
            : false;

        return (
          <div className="flex flex-col justify-end">
            {canResume && (
              <div className="mb-2">
                <ExamResumeTimer
                  exam={e}
                  onTimeUp={() => handleTimeUp(e.id)}
                  isExamCompleted={canResume}
                />
              </div>
            )}
            <Button
              variant={canResume ? "light-blue" : "light-green"}
              label={canResume ? "Resume" : "Start"}
              disabled={!!e.exams_id?.import_is_shell}
              onClick={async () => {
                if (!currentAgency?.id || !e?.exams_id?.id) {
                  console.error("Agency ID or Exam ID is missing.");
                  return;
                }

                try {
                  if (isProctored && isIAEnabled) {
                    const matchingActivity = activitySettings?.find(
                      (activity) => activity.Activity_Id === e?.exams_id?.id
                    );

                    if (
                      !matchingActivity ||
                      Number(matchingActivity.Enabled) === -1
                    ) {
                      notify(
                        CUSTOM_MESSAGE(
                          "error",
                          <>This exam has been disabled in IA settings.</>,
                          <>
                            Please contact your agency to request re-enabling of
                            this exam.
                          </>
                        )
                      );
                      return;
                    }

                    router.push(`/clinician/exams/${e?.id}/proctored-exam`);
                  } else {
                    canResume
                      ? router.push(`/clinician/exams/${e?.id}/question`)
                      : router.push(`/clinician/exams/${e?.id}/start`);
                  }
                } catch (err) {
                  console.error("Error fetching activity settings:", err);
                }
              }}
            />
          </div>
        );
      case CompetencyState.NOT_STARTED:
        return (
          <Button
            variant="light-green"
            label="Start"
            disabled={!!e.exams_id?.import_is_shell}
            onClick={async () => {
              if (!currentAgency?.id || !e?.exams_id?.id) {
                console.error("Agency ID or Exam ID is missing.");
                return;
              }
              try {
                if (isProctored && isIAEnabled) {
                  const matchingActivity = activitySettings?.find(
                    (activity) => activity.Activity_Id === e?.exams_id?.id
                  );

                  if (
                    !matchingActivity ||
                    Number(matchingActivity.Enabled) === -1
                  ) {
                    notify(
                      CUSTOM_MESSAGE(
                        "error",
                        <>This exam has been disabled in IA settings.</>,
                        <>
                          Please contact your agency to request re-enabling of
                          this exam.
                        </>
                      )
                    );
                    return;
                  }
                }

                if (isProctored) {
                  router.push(`/clinician/exams/${e?.id}/proctored-exam`);
                } else {
                  router.push(`/clinician/exams/${e?.id}/start`);
                }
              } catch (err) {
                console.error("Error fetching activity settings:", err);
              }
            }}
          />
        );
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-medium text-purple-400">Exams</h1>
      <ContentTypeList
        filters={
          <>
            <div className="h-full rounded-md bg-white">
              <FilterCombo
                label="STATUS"
                placeholder="Filter by Status"
                options={statusOptions}
                filters={statusFilters}
                setFilters={setStatusFilters}
              />
              <FilterCombo
                label="CATEGORY"
                placeholder="Filter by Category"
                options={(modalityOptions as FilterComboOptions[]) || []}
                filters={categoryFilters}
                setFilters={setCategoryFilters}
              />
            </div>
          </>
        }
        totalItems={exams?.length}
        loading={examsQuery.loading}
        content={
          exams?.length
            ? exams.map((e) => {
                const expirationDate = e?.expires_on
                  ? new Date(e.expires_on)
                  : null;

                const actions = (
                  <>
                    <div>{renderButtons(e as UserExamsFragment)}</div>
                    <p className="mt-2 text-right text-xs text-gray-500">
                      Attempts {`${e?.attempts_used}/${e?.allowed_attempts}`}
                    </p>
                  </>
                );

                return (
                  <div
                    key={e?.id}
                    className="mb-4 flex flex-col rounded-lg px-4 py-6 shadow"
                  >
                    <div className="flex gap-3">
                      <div className="hidden h-[110px] w-[130px] items-center justify-center rounded-md border-gray-300 bg-purple-50 md:flex">
                        <FontAwesomeIcon
                          icon={faBallotCheck}
                          className="text-4xl text-purple-400"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-[40px] w-[50px] items-center justify-center rounded-md border-gray-300 bg-purple-50 md:hidden">
                            <FontAwesomeIcon
                              icon={faBallotCheck}
                              className="text-2xl text-purple-400"
                            />
                          </div>
                          <h6 className="text-sm font-bold uppercase text-purple-500 md:hidden">
                            {e?.exams_id?.modality?.title}
                          </h6>
                          <Badge colors="bg-purple-50 text-purple-500">
                            {e?.agency?.name}
                          </Badge>
                        </div>
                        <h6 className="hidden text-sm font-bold uppercase text-purple-500 md:block">
                          {e?.exams_id?.modality?.title}
                        </h6>
                        <h5 className="break-words text-lg font-medium leading-5 text-black">
                          {e?.exams_id?.title}
                        </h5>
                        <p className="text-sm leading-6 text-gray-500">
                          {e?.exams_id?.exam_versions?.at(0)?.description}
                        </p>
                        {expirationDate &&
                          e?.status !== CompetencyState.INVALID &&
                          e?.status !== CompetencyState.IN_REVIEW && (
                            <span className="text-xs text-gray-500">
                              Expires On:{" "}
                              {formatExpiresOnDate(expirationDate as Date)}
                            </span>
                          )}
                        <div className="flex w-full flex-col gap-1 text-xs text-gray-500 md:flex-row md:gap-4">
                          {e?.assigned_on && (
                            <span>
                              Assigned: {formatDateTime(e?.assigned_on as Date)}
                            </span>
                          )}

                          {e?.started_on &&
                            e?.status !== CompetencyState.COMPLETED && (
                              <>
                                <span>
                                  Started:{" "}
                                  {formatDateTime(e?.started_on as Date)}
                                </span>
                              </>
                            )}
                          {e?.finished_on &&
                            e?.status !== CompetencyState.INVALID &&
                            e?.status !== CompetencyState.IN_REVIEW && (
                              <>
                                <span>
                                  Finished:{" "}
                                  {formatDateTime(e?.finished_on as Date)}
                                </span>
                              </>
                            )}

                          {e?.due_date &&
                            e.status !== CompetencyState.FAILED && (
                              <span>
                                Due Date:{" "}
                                {getFormattedDueDate(e.due_date as Date)}
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="hidden md:block">{actions}</div>
                    </div>
                    <div className="mt-4 grid justify-end md:hidden">
                      {actions}
                    </div>
                  </div>
                );
              })
            : null
        }
      />
    </DashboardLayout>
  );
}

export default withAuth(ClinicianExams, ClinicianGroup);
