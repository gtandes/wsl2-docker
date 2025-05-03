import React from "react";
import Image from "next/image";
import LogoHeader from "../assets/logo.png";
import TopBlue from "../assets/login/top_blue.png";
import Link from "next/link";

export const PublicHeader = () => {
  return (
    <header className="h-32">
      <div className="h-32">
        <Image
          className="relative left-0 top-0 w-[700px]"
          alt="top_blue"
          src={TopBlue}
          priority
        />
        <Link href="/" className="absolute left-5 top-5 z-10">
          <Image alt={"Logo"} src={LogoHeader} />
        </Link>
      </div>
    </header>
  );
};
