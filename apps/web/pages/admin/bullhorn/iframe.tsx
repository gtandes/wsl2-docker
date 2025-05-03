import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useAgency } from "../../../hooks/useAgency";
import { query } from "../../../utils/utils";
import Button from "../../../components/Button";
import {
  GENERIC_ERROR,
  GENERIC_SUCCESS_CREATED,
  notify,
} from "../../../components/Notification";
import { UserRole } from "types";
import router from "next/router";
import { Spinner } from "../../../components/Spinner";
import { Logo } from "../../../components/utils/Logo";

const CustomTabBullhorn = () => {
  const { currentAgency } = useAgency();
  const [error, setError] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    const fetchJWT = async (token: string) => {
      try {
        const response = await query(
          "/cms/integration/custom-tab/get-jwt",
          "POST",
          { token }
        );

        const data = await response.json();

        if (data.success && data.jwt_token) {
          localStorage.setItem("ger_auth_token", data.jwt_token);
        } else {
          setError("Token is Expired, Please generate a new link in HSH.");
        }
      } catch (err) {
        console.error("Error fetching JWT token:", err);
        setError("Error fetching JWT token");
      } finally {
        setLoading(false);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const candidateId = urlParams.get("EntityID");
    const token = urlParams.get("token");

    if (!localStorage.getItem("ger_auth_token")) {
      localStorage.setItem("ger_auth_token", "");
    }

    if (token) {
      fetchJWT(token);
    }

    if (candidateId && currentAgency) {
      const fetchCandidateDetails = async (candidateId: string) => {
        if (!candidateId || !currentAgency) return;
        try {
          const response = await query(
            `/cms/integration/bullhorn/candidate/${candidateId}?agency_id=${currentAgency.id}`,
            "GET"
          );

          if (!response.ok)
            throw new Error("Failed to fetch candidate details");

          const data = await response.json();

          if (data.data && Object.keys(data.data).length > 0) {
            setCandidateData(data.data);
          } else {
            setCandidateData(null);
          }

          if (data?.data?.user_id) {
            router.push(`/admin/users/${data.data.user_id}/competencies`);
          }
        } catch (error: any) {
          console.error("Error fetching candidate details:", error);
          setError(error.message || "Error fetching candidate details");
        } finally {
          setLoading(false);
        }
      };

      fetchCandidateDetails(candidateId);
    }
  }, [currentAgency]);

  const createUserProfile = async () => {
    if (isCreatingProfile || !candidateData) return;
    setIsCreatingProfile(true);

    try {
      const response = await query("/api/v1/user/create", "POST", {
        first_name: candidateData.firstName,
        last_name: candidateData.lastName,
        email: candidateData.email,
        role: UserRole.Clinician,
        agencies: [
          {
            agencies_id: {
              id: currentAgency?.id,
            },
            bullhorn_id: candidateData.id,
          },
        ],
      });

      if (!response.ok) throw new Error("Profile creation failed");

      notify(GENERIC_SUCCESS_CREATED);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error("Error creating profile:", err);
      notify(GENERIC_ERROR);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-[400] items-center justify-center rounded-md bg-white">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-[400] items-center justify-center bg-gray-200">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!currentAgency?.bh_enable) {
    return (
      <div className="flex h-screen w-[400] items-center justify-center bg-gray-200">
        <p className="text-red-500">
          Bullhorn Integration is currently disabled. Please contact HSH Support
          to enable it.
        </p>
      </div>
    );
  }

  if (candidateData?.userExists === false) {
    return (
      <div className="flex h-screen w-[400] items-center justify-center bg-gray-100">
        <div className="relative justify-center rounded-md bg-white p-5 text-center">
          <div
            className="text-md mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">
              <i className="fa-solid fa-triangle-exclamation"></i> Candidate not
              found in HSH!
            </span>
          </div>
          <p className="text-md mb-4 ml-3 mt-4 text-gray-700">
            We were unable to locate this candidate in the HSH system. <br />
            To proceed, please click the <strong>Create Profile</strong> button
            to initiate the candidate&apos;s profile creation.
          </p>
          <Button label="Create Profile" onClick={createUserProfile} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <div className="relative flex w-full max-w-lg flex-col items-center justify-center rounded-md bg-white p-8 text-center shadow-lg">
        <div className="mb-4 flex w-full items-center">
          <div className="mr-6">
            <Logo />
          </div>
          <div className="h-20 border-l-2 border-gray-300"></div>
          <p className="text-md ml-6 text-lg">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default CustomTabBullhorn;
