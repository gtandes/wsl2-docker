import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "../../utils/utils";

interface RouterTabsProps {
  tabs: string[];
  rootPath: string;
}

export const RouterTabs: React.FC<RouterTabsProps> = ({ tabs, rootPath }) => {
  const router = useRouter();
  const selected = router.asPath.split("/").pop();
  return (
    <div className="noprint mb-6 border-b border-gray-200">
      {tabs.map((tab, i) => (
        <Link
          key={i + tab}
          href={`${rootPath}/${tab.toLowerCase().replace(/ /g, "-")}`}
        >
          <div
            className={cn(
              "border-transparent mr-2 inline-block rounded-t-lg border-b-2 px-4 py-4 text-center text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-600",
              selected === tab.toLowerCase().replace(/ /g, "-") &&
                "cursor-default border-blue-700 text-blue-700 focus-visible:outline-none"
            )}
          >
            {tab}
          </div>
        </Link>
      ))}
    </div>
  );
};
