import React, { FormEventHandler, useState } from "react";
import Logo from "../assets/logo.svg";
import Image from "next/image";
import LeftImage from "../assets/login/left_image.png";
import { Spinner } from "../components/Spinner";
import { GENERIC_ERROR, notify } from "../components/Notification";
import { directus } from "../utils/directus";
import { useRouter } from "next/router";
import Button from "../components/Button";
import { PublicHeader } from "../components/PublicHeader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/pro-regular-svg-icons";
import clsx from "clsx";
import { PublicFooter } from "../components/PublicFooter";
import Link from "next/link";

const passwordRegex =
  /(?=^.{8,}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*\s).*$/;

export default function ResetPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLinkError, setShowLinkError] = useState(false);
  const [done, setDone] = useState(false);

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (ev) => {
    setLoading(true);
    ev.preventDefault();
    const formData = new FormData(ev.currentTarget);
    const { password, repeat } = Object.fromEntries(formData);
    try {
      if (password != repeat) {
        setError("Passwords do not match");
        return;
      }
      if (!String(password).match(passwordRegex)) {
        setError("Password does not meet requirements.");
        return;
      }

      await directus.auth.password.reset(
        router.query.token as string,
        password as string
      );
      setDone(true);
    } catch (error) {
      setShowLinkError(true);
      notify(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState({
    original: false,
    repeat: false,
  });

  const togglePasswordVisibility = (input: "original" | "repeat") => {
    switch (input) {
      case "original":
        setShowPassword({
          original: !showPassword.original,
          repeat: showPassword.repeat,
        });
        break;
      case "repeat":
        setShowPassword({
          original: showPassword.original,
          repeat: !showPassword.repeat,
        });
        break;
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <PublicHeader />
      <section className="flex flex-wrap items-center justify-center gap-10">
        <Image width={800} alt="left_image" src={LeftImage} priority />
        <div className="flex w-full flex-col items-center rounded-xl bg-white px-10 py-20 xl:w-1/3">
          <Image
            width={50}
            height={45}
            alt={"Logo"}
            src={Logo}
            className="sm:h-16 sm:w-16"
          />
          {!done ? (
            <>
              <h1 className="sm:bold mt-6 text-2xl font-medium text-gray-900">
                Reset your password
              </h1>
              <p className="mt-4 text-center text-sm text-gray-500">
                The password should contain at least 8 characters, 1 uppercase,
                1 lowercase, 1 number and 1 special character.
              </p>
              <form
                className="mt-4 flex w-full flex-col items-center"
                onSubmit={handleFormSubmit}
              >
                <div className="flex w-full flex-row">
                  <input
                    className="w-full rounded-t-lg border border-gray-300 p-2"
                    type={showPassword.original ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    required
                    disabled={loading}
                  />
                  <FontAwesomeIcon
                    icon={showPassword.original ? faEyeSlash : faEye}
                    onClick={() => togglePasswordVisibility("original")}
                    className={clsx(
                      showPassword.original ? "right-[31px] " : "right-[30px]",
                      "relative top-[13px] -mr-[30px] cursor-pointer text-gray-400"
                    )}
                  />
                </div>
                <div className="flex w-full flex-row">
                  <input
                    className="w-full rounded-b-lg border border-t-0 border-gray-300 p-2"
                    type={showPassword.repeat ? "text" : "password"}
                    name="repeat"
                    placeholder="Repeat password"
                    required
                    disabled={loading}
                  />
                  <FontAwesomeIcon
                    icon={showPassword.repeat ? faEyeSlash : faEye}
                    onClick={() => togglePasswordVisibility("repeat")}
                    className={clsx(
                      showPassword.repeat ? "right-[31px] " : "right-[30px]",
                      "relative top-[13px] -mr-[30px] cursor-pointer text-gray-400"
                    )}
                  />
                </div>
                <p className="mt-2 text-sm text-red-600">
                  {showLinkError ? (
                    <>
                      We are unable to reset your password.
                      <br />
                      Links to reset password are only valid for 24 hours.{" "}
                      <br />
                      Please make sure that you are using the most recent link
                      sent to your email or navigate to the{" "}
                      <Link className="underline" href="/forgot">
                        Forgot Password
                      </Link>{" "}
                      page to request a new one.
                    </>
                  ) : (
                    error
                  )}
                </p>
                <button
                  className="mt-10 flex h-10 w-full items-center justify-center rounded-md bg-blue-800 px-5 text-center text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <Spinner /> : "Reset password"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="sm:bold mt-6 text-2xl font-medium text-gray-900">
                Thank you!
              </h1>
              <p className="my-4 text-center text-sm text-gray-500">
                Your password has been updated. <br />
                Please Sign In with your new password.
              </p>
              <Button onClick={() => router.push("/")} label="Sign In" />
            </>
          )}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
