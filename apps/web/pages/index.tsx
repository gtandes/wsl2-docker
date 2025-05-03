import React, {
  FormEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import Logo from "../assets/logo.svg";
import Image from "next/image";
import { Spinner } from "../components/Spinner";
import {
  INCORRECT_LOGIN,
  LOGIN_SUCCESS,
  notify,
} from "../components/Notification";
import Link from "next/link";
import LeftImage from "../assets/login/left_image.png";
import { PublicFooter } from "../components/PublicFooter";
import { PublicHeader } from "../components/PublicHeader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/pro-regular-svg-icons";
import clsx from "clsx";
import { MaintenanceBanners } from "../components/BannerMaintenance";
import { useRouter } from "next/router";

export default function Login() {
  const {
    login,
    logout,
    currentUser,
    loaded: authLoaded,
    redirects,
  } = useAuth();
  const router = useRouter();
  const { logoutAction } = router.query;
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const checkSession = useCallback(async () => {
    if (currentUser) {
      await redirects(currentUser?.role);
    }
  }, [currentUser, redirects]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (logoutAction) {
      logout();
    }
  }, [logout]);

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (ev) => {
    setLoading(true);
    ev.preventDefault();
    const formData = new FormData(ev.currentTarget);
    const { email, password } = Object.fromEntries(formData);
    try {
      await login(email as string, password as string);
      notify(LOGIN_SUCCESS);
    } catch (error) {
      console.error(error);

      let message;
      if (error instanceof Error) message = error.message;
      else message = String(error);

      if (message === "inactive") {
        notify({
          type: "error",
          title: "Inactive account",
          description: (
            <>
              Your user is not active. Please contact our technical support at
              support@hs-hire.com
            </>
          ),
        });
      } else {
        notify(INCORRECT_LOGIN);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <PublicHeader />
      <section className="flex flex-wrap items-center justify-center gap-10">
        <Image width={800} alt="left_image" src={LeftImage} priority />
        <div className="flex w-full flex-col items-center rounded-xl bg-white px-10 py-20 xl:w-1/3">
          <div className="mb-4 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0"></div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Welcome to the New Healthcare Staffing Hire Learning
                  Management Platform!
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="mb-3">
                    If this is your first time accessing the new site, we ask
                    you to{" "}
                    <Link
                      href="/forgot"
                      className="font-medium text-blue-800 underline"
                    >
                      reset your password
                    </Link>{" "}
                    to ensure a seamless transition.
                  </p>
                  <p>
                    Best regards, <br />
                    The Healthcare Staffing Hire Team
                  </p>
                </div>
              </div>
            </div>
          </div>
          <MaintenanceBanners isLogin />
          <Image
            width={50}
            height={45}
            alt={"Logo"}
            src={Logo}
            className="sm:h-16 sm:w-16"
          />
          <h1 className="sm:bold mt-6 text-2xl font-medium text-gray-900">
            Sign in to your account
          </h1>
          <form
            className="mt-16 flex w-full flex-col items-center"
            onSubmit={handleFormSubmit}
          >
            <input
              className="w-full rounded-t-lg border border-gray-300 p-2"
              type="email"
              name="email"
              placeholder="Email address"
              required
              disabled={loading || !authLoaded}
            />
            <div className="flex w-full flex-row">
              <input
                className="w-full rounded-b-lg border border-t-0 border-gray-300 p-2"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                disabled={loading || !authLoaded}
              />
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                onClick={() => setShowPassword(!showPassword)}
                className={clsx(
                  showPassword ? "right-[31px] " : "right-[30px]",
                  "relative top-[13px] -mr-[30px] cursor-pointer text-gray-400"
                )}
              />
            </div>
            <Link
              href="/forgot"
              className="mt-2 flex self-end text-sm text-blue-800 underline"
            >
              Forgot your password?
            </Link>
            <button
              className="mt-10 flex h-10 w-full items-center justify-center rounded-md bg-blue-800 px-5 text-center text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading || !authLoaded ? <Spinner /> : "Sign in"}
            </button>
          </form>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
