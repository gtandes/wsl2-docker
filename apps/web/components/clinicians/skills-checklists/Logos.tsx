import Image from "next/image";
import { Logo } from "../../utils/Logo";
import { useAgency } from "../../../hooks/useAgency";

export const Logos = () => {
  const globalAgency = useAgency();
  const agencyLogo = globalAgency.currentAgency?.logo?.src || "";

  return (
    <div className={`flex ${agencyLogo ? "justify-between" : "justify-end"}`}>
      {agencyLogo && (
        <Image
          width={100}
          height={48}
          alt={`Agency - ${globalAgency.currentAgency?.name}`}
          src={agencyLogo}
        />
      )}
      <Logo />
    </div>
  );
};
