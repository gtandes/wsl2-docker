import { Junction_Sc_Definitions_Directus_Users } from "api";
import { Birthstone } from "next/font/google";

const birthstone = Birthstone({
  weight: ["400"],
  subsets: ["latin"],
});

interface Props {
  assignmentData: Junction_Sc_Definitions_Directus_Users;
}
export const Signature = ({ assignmentData }: Props) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-4">
        <span className="w-20 text-sm font-medium">Signature:</span>
        <span className={birthstone.className + " border-b text-4xl"}>
          {assignmentData.directus_users_id?.first_name}{" "}
          {assignmentData.directus_users_id?.last_name}
        </span>
      </div>
      <div className="flex items-end gap-4 text-sm">
        <span className="w-20 font-medium">Name:</span>
        <span className="border-b">
          {assignmentData.directus_users_id?.first_name}{" "}
          {assignmentData.directus_users_id?.last_name}
        </span>
      </div>
    </div>
  );
};
