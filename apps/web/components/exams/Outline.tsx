import React from "react";

interface Props {
  id: string;
  classes?: string;
}

export const Outline: React.FC<Props> = ({ id, classes }) => {
  return (
    <a
      className={
        classes
          ? classes
          : `inline-flex h-9 items-center justify-center gap-x-1.5 whitespace-nowrap rounded-md bg-blue-800 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50`
      }
      href={`/cms/assets/${id}?#toolbar=0&navpanes=0&scrollbar=0`}
      target="_blank"
      rel="noreferrer noopener"
    >
      Course Outline
    </a>
  );
};
