import React from "react";
import Image from "next/image";
import BottomBlue from "../assets/login/bottom_blue.png";

export const PublicFooter = () => {
  return (
    <footer className="mt-auto">
      <Image className="ml-auto w-96" alt="bottom_blue" src={BottomBlue} />
    </footer>
  );
};
