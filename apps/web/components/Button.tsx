import React from "react";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { Spinner } from "./Spinner";

export interface ButtonProps
  extends Omit<React.ComponentProps<"button">, "size"> {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?:
    | "solid"
    | "green"
    | "light"
    | "light-blue"
    | "light-red"
    | "light-green"
    | "light-gray"
    | "outline"
    | "rounded"
    | "link";
  iconLeft?: IconDefinition;
  icon?: IconDefinition;
  iconRight?: IconDefinition;
  classes?: string;
  loading?: boolean;
}

export default function Button({
  label,
  size = "md",
  variant = "solid",
  iconLeft,
  icon,
  iconRight,
  classes,
  loading,
  ...props
}: ButtonProps) {
  const baseClasses =
    "whitespace-nowrap inline-flex items-center justify-center rounded-md gap-x-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  let typeClasses = "";
  let sizeClasses = "";

  switch (variant) {
    case "solid":
      typeClasses +=
        "shadow-sm bg-blue-800 text-white hover:bg-blue-400 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "green":
      typeClasses +=
        "bg-green-400 text-white hover:bg-green-500 focus-visible:outline-green-400 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "light":
      typeClasses +=
        "shadow-sm bg-blue-100 text-blue-900 hover:bg-blue-200 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "light-blue":
      typeClasses +=
        "bg-blue-100 text-blue-800 hover:bg-blue-200 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "light-red":
      typeClasses +=
        "bg-red-100 text-red-800 hover:bg-red-200 focus-visible:outline-red-100 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "light-green":
      typeClasses +=
        "bg-green-50 text-green-500 hover:bg-green-100 focus-visible:outline-green-50 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "light-gray":
      typeClasses +=
        "bg-gray-50 text-gray-600 hover:bg-gray-100 focus-visible:outline-gray-50 disabled:pointer-events-none disabled:opacity-50";
      break;
    case "outline":
      typeClasses +=
        "shadow-sm bg-white text-gray-700 focus-visible:outline-blue-600 border-gray-300 border disabled:pointer-events-none disabled:opacity-50";
      break;
    case "link":
      typeClasses +=
        "bg-transparent text-gray-700 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50 shadow-none";
      break;
    case "rounded":
      break;
  }

  switch (size) {
    case "xs":
      sizeClasses += "px-2.5 h-7 text-xs font-medium";
      break;
    case "sm":
      sizeClasses += "px-3.5 h-8 text-sm font-medium";
      break;
    case "md":
      sizeClasses += "px-4 h-9 text-sm font-medium";
      break;
    case "lg":
      sizeClasses += "px-5 h-11 text-md font-medium";
      break;
    case "xl":
      sizeClasses += "px-5 h-12 text-md font-medium";
      break;
  }

  return (
    <button
      className={clsx(baseClasses, typeClasses, sizeClasses, classes)}
      disabled={loading}
      type={props.type || "button"}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {iconLeft && <FontAwesomeIcon icon={iconLeft} className="mr-1" />}
          {label ? label : icon && <FontAwesomeIcon icon={icon} />}
          {iconRight && <FontAwesomeIcon icon={iconRight} className="ml-1" />}
        </>
      )}
    </button>
  );
}
