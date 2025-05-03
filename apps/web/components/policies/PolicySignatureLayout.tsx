import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import clsx from "clsx";
import { useRouter } from "next/router";
import { usePrintMode } from "../../hooks/usePrintMode";
import { AvatarMenu } from "../AvatarMenu";
import Button from "../Button";

interface PolicySignatureLayoutProps {
  children: React.ReactNode;
}

export const PolicySignatureLayout: React.FC<PolicySignatureLayoutProps> = ({
  children,
}) => {
  const { print } = usePrintMode();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      <div className="container">
        <div
          className={clsx("noprint my-3 flex align-middle", "justify-between")}
        >
          <Button
            iconLeft={faArrowLeft}
            label="Back"
            variant="link"
            onClick={() => router.back()}
          />
          <Button
            disabled={false}
            label="Download"
            variant="solid"
            onClick={() => print()}
          />
        </div>
        <div className="flex flex-col gap-16 rounded-lg bg-white px-2 pb-16 pt-7 print:pt-0 sm:px-6 lg:px-24">
          {children}
        </div>
      </div>
    </div>
  );
};
