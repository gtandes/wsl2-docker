import Image from "next/image";
import AppLogo from "../../assets/app-logo.png";

export const Logo = () => {
  return <Image width={153} alt={"Logo"} src={AppLogo} />;
};
