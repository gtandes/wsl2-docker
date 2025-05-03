import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAgency } from "../../../hooks/useAgency";
import { Exams_Filter, useGetAllExamsQuery } from "api";
import { DirectusStatus } from "types";
import { Spinner } from "../../Spinner";
import { useAuth } from "../../../hooks/useAuth";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

type Course = { Name: string; Id: string };
type Activity = { Name: string; Id: string };
function transformExamsToCoursesAndActivities(exams: any[]): {
  courses: Course[];
  activities: Activity[];
} {
  const coursesMap = new Map<string, Course>();
  const activities: Activity[] = [];

  exams.forEach((exam) => {
    if (exam.modality) {
      const modalityId = exam.modality.id;
      const modalityTitle = exam.modality.title;

      if (!coursesMap.has(modalityId)) {
        coursesMap.set(modalityId, { Name: modalityTitle, Id: modalityId });
      }

      activities.push({ Name: exam.title, Id: `${modalityId}_${exam.id}` });
    }
  });

  const courses = Array.from(coursesMap.values());

  if (courses.length === 1) {
    courses.push({ Name: "-", Id: "-" });
  }

  return { courses, activities };
}

interface LaunchData {
  user_id: string;
  roles: string;
  resource_link_id: string;
  lis_person_name_full: string;
  lis_person_name_family: string;
  lis_person_name_given: string;
  lis_person_contact_email_primary: string;
  context_id: number;
  lti_message_type: string;
  lti_version: string;
  oauth_callback: string;
  oauth_consumer_key: string;
  oauth_nonce: string;
  oauth_signature_method: string;
  oauth_timestamp: number;
  oauth_version: string;
  custom_courses?: string;
  custom_activities?: string;
}

const IntegrityAdvocateAdmin: React.FC = () => {
  const globalAgency = useAgency();
  const { currentUser, loaded } = useAuth();
  const { flags } = useFeatureFlags();

  const appId = globalAgency.currentAgency?.ia_app_id;
  const apiKey = globalAgency.currentAgency?.ia_api_key;
  const isIaEnable = globalAgency.currentAgency?.ia_enable;

  const [transformedData, setTransformedData] = useState<{
    courses: Course[];
    activities: Activity[];
  }>({
    courses: [],
    activities: [],
  });
  const [formData, setFormData] = useState<LaunchData | null>(null);
  const [signature, setSignature] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const filter = useMemo<Exams_Filter>(
    () => ({
      _and: [
        { status: { _in: [DirectusStatus.PUBLISHED, DirectusStatus.DRAFT] } },
        {
          _or: [
            {
              _or: [
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: globalAgency.currentAgency?.id
                          ? [String(globalAgency.currentAgency?.id)]
                          : [null],
                      },
                    },
                  },
                },
                { agencies: { agencies_id: { id: { _null: true } } } },
              ],
            },
            { id: { _nnull: !globalAgency.currentAgency?.id } },
          ],
        },
        { exam_versions: { is_proctoring: { _eq: true } } },
      ],
    }),
    [globalAgency.currentAgency]
  );

  const examsQuery = useGetAllExamsQuery({
    variables: { filter },
    skip: !globalAgency.loaded,
  });

  useEffect(() => {
    if (examsQuery.data?.exams) {
      setTransformedData(
        transformExamsToCoursesAndActivities(examsQuery.data.exams)
      );
    }
  }, [examsQuery.data]);

  const { courses, activities } = transformedData;

  const launchUrl =
    "https://www.integrityadvocateserver.com/integration/lti/AdminParticipants";

  const stringToUint8Array = useCallback(
    (str: string): Uint8Array => new TextEncoder().encode(str),
    []
  );

  const uint8ArrayToBase64 = useCallback((bytes: Uint8Array): string => {
    const binString = Array.from(bytes, (x) => String.fromCharCode(x)).join("");
    return btoa(binString);
  }, []);

  const generateSignature = useCallback(
    async (data: LaunchData): Promise<string> => {
      if (!apiKey) throw new Error("API Key is required");

      const sortedParams = Object.entries(data)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(
          ([key, value]) => `${key}=${encodeURIComponent(value.toString())}`
        );

      const baseString = [
        "POST",
        encodeURIComponent(launchUrl),
        encodeURIComponent(sortedParams.join("&")),
      ].join("&");
      const signingKey = `${encodeURIComponent(apiKey)}&`;
      const messageData = stringToUint8Array(baseString);
      const keyData = stringToUint8Array(signingKey);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        messageData
      );

      return uint8ArrayToBase64(new Uint8Array(signature));
    },
    [apiKey, launchUrl, stringToUint8Array, uint8ArrayToBase64]
  );

  useEffect(() => {
    if (
      !appId ||
      !currentUser ||
      courses.length === 0 ||
      activities.length === 0
    )
      return;

    const generateLaunchData = async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomUUID();
      const launchData: LaunchData = {
        user_id: "1",
        roles: "Admin",
        resource_link_id: "1",
        lis_person_name_full: `${currentUser.firstName} ${currentUser.lastName}`,
        lis_person_name_family: currentUser.lastName,
        lis_person_name_given: currentUser.firstName,
        lis_person_contact_email_primary: currentUser.email,
        context_id: 1,
        lti_message_type: "basic-lti-launch-request",
        lti_version: "LTI-1p0",
        oauth_callback: "about:blank",
        oauth_consumer_key: appId,
        oauth_nonce: nonce,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: timestamp,
        oauth_version: "1.0",
        custom_courses: JSON.stringify(courses),
        custom_activities: JSON.stringify(activities),
      };

      setFormData(launchData);
      const generatedSignature = await generateSignature(launchData);
      setSignature(generatedSignature);
    };

    generateLaunchData();
  }, [appId, generateSignature, courses, activities, currentUser]);

  useEffect(() => {
    if (formData && signature && formRef.current) {
      formRef.current.submit();
    }
  }, [formData, signature]);

  if (!currentUser || !loaded) return <Spinner />;
  if (!globalAgency.loaded) return <Spinner />;
  if (!isIaEnable || !flags["enabled_integrity_advocate"])
    return <p>Integrity Advocate is disabled</p>;
  if (courses.length === 0 || activities.length === 0)
    return (
      <p>
        You need to add a modality that has an exam with proctoring enabled.
      </p>
    );

  return (
    <div className="space-y-4">
      {formData && (
        <form
          ref={formRef}
          id="ltiLaunchForm"
          method="POST"
          action={launchUrl}
          target="integrityAdvocateFrame"
          className="hidden"
        >
          {Object.entries(formData).map(([key, value]) => (
            <input
              key={key}
              type="hidden"
              name={key}
              value={value.toString()}
            />
          ))}
          <input type="hidden" name="oauth_signature" value={signature} />
        </form>
      )}
      <iframe
        name="integrityAdvocateFrame"
        className="h-[800px] w-full rounded-lg border border-gray-200"
        title="Integrity Advocate Admin Interface"
      />
    </div>
  );
};

export default IntegrityAdvocateAdmin;
