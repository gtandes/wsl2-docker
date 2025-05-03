import clsx from "clsx";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  name: string;
  disabled?: boolean;
}
export const ScoreSelector = ({
  name,
  value,
  onChange,
  disabled = false,
}: Props) => {
  const router = useRouter();
  const isPreview = router.query.preview === "true";
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <div className="flex items-center gap-4">
      {Array.from({ length: 5 }).map((_, index) => {
        const fieldValue = index + 1;
        const isNA = fieldValue === 5;

        return (
          <label className="relative flex" key={index}>
            <input
              required={!isPreview}
              className="absolute bottom-1 right-1/2 h-0 w-0"
              type="radio"
              name={name}
              id={`${name} - ${index + 1}`}
              onChange={() => {
                onChange(isNA ? 0 : fieldValue);
              }}
              checked={currentValue === fieldValue || (isNA && value === 0)}
              disabled={disabled}
            />
            <span
              className={clsx(
                "z-10 flex items-center justify-center rounded px-2 py-1 text-xs md:px-3 md:py-2",
                {
                  "bg-green-500 text-white":
                    value === fieldValue || (value === 0 && isNA),
                  "cursor-pointer bg-gray-100 text-blue-900 hover:bg-gray-200":
                    (value !== fieldValue && !isNA) || (value !== 0 && isNA),
                  "disabled:bg-gray-300 disabled:text-gray-500": disabled,
                }
              )}
            >
              {fieldValue === 5 ? "N/A" : fieldValue}
            </span>
          </label>
        );
      })}
    </div>
  );
};
