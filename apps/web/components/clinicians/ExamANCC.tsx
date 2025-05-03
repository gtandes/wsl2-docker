import React, { useState } from "react";

type Props = {
  label: string;
  body: string;
};

const ExamANCC: React.FC<Props> = ({ label, body }) => {
  const [showBody, setShowBody] = useState(false);

  return (
    <div className="border-b border-gray-200 pb-3 text-sm text-black md:border-blue-400 md:text-white">
      <div className="mt-4 flex justify-between">
        <p>{label}</p>
        <button
          className="ml-3 flex-shrink-0 cursor-pointer underline md:font-medium md:no-underline"
          onClick={() => setShowBody(!showBody)}
        >
          Read more
        </button>
      </div>
      {showBody && <p className="mt-3 text-left text-xs">{body}</p>}
    </div>
  );
};

export default ExamANCC;
