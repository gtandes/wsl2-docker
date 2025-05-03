import { FormEventHandler, useState } from "react";
import Logo from "../assets/logo.svg";
import Image from "next/image";
import LeftImage from "../assets/login/left_image.png";
import { Spinner } from "../components/Spinner";
import { GENERIC_ERROR, notify } from "../components/Notification";
import { directus } from "../utils/directus";
import { PublicHeader } from "../components/PublicHeader";
import { PublicFooter } from "../components/PublicFooter";

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (ev) => {
    setLoading(true);
    ev.preventDefault();
    const formData = new FormData(ev.currentTarget);
    const { email } = Object.fromEntries(formData);
    try {
      await directus.auth.password.request(
        email as string,
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.NEXT_PUBLIC_PASSWORD_RESET_URL_ALLOW_LIST as string
      );
      setSent(true);
    } catch (error) {
      notify(GENERIC_ERROR);
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
          <Image
            width={50}
            height={45}
            alt={"Logo"}
            src={Logo}
            className="sm:h-16 sm:w-16"
          />
          {!sent ? (
            <>
              <h1 className="sm:bold mt-6 text-2xl font-medium text-gray-900">
                Forgot password?
              </h1>
              <p className="mt-4 text-center text-sm text-gray-500">
                Enter your email address to receive instructions <br />
                on how to reset your password.
              </p>
              <form
                className="mt-4 flex w-full flex-col items-center"
                onSubmit={handleFormSubmit}
              >
                <input
                  className="w-full rounded border border-gray-300 p-2"
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  disabled={loading}
                />
                <button
                  className="mt-10 flex h-10 w-full items-center justify-center rounded-md bg-blue-800 px-5 text-center text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <Spinner /> : "Send email"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="sm:bold mt-6 text-2xl font-medium text-gray-900">
                Thank you!
              </h1>
              <p className="mt-4 text-center text-sm text-gray-500">
                An email has been sent with instructions <br />
                on how to reset your password.
              </p>
            </>
          )}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
