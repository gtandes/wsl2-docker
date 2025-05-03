import React, { createContext, useContext, useState, ReactNode } from "react";

interface IntegrityAdvocate {
  participantId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId: string;
  activityId: string;
  assignmentId: string;
  externaluserid: string;
}

interface IntegrityAdvocateContextType {
  integrityAdvocate: IntegrityAdvocate | null;
  setIntegrityAdvocate: React.Dispatch<
    React.SetStateAction<IntegrityAdvocate | null>
  >;
  showIntegrityAdvocate: boolean;
  setShowIntegrityAdvocate: (show: boolean) => void;
}

interface IntegrityAdvocateProviderProps {
  children: ReactNode;
}

const IntegrityAdvocateContext = createContext<
  IntegrityAdvocateContextType | undefined
>(undefined);

export const IntegrityAdvocateProvider: React.FC<
  IntegrityAdvocateProviderProps
> = ({ children }) => {
  const [integrityAdvocate, setIntegrityAdvocate] =
    useState<IntegrityAdvocate | null>(null);
  const [showIntegrityAdvocate, setShowIntegrityAdvocate] = useState(false);

  return (
    <IntegrityAdvocateContext.Provider
      value={{
        integrityAdvocate,
        setIntegrityAdvocate,
        showIntegrityAdvocate,
        setShowIntegrityAdvocate,
      }}
    >
      {children}
    </IntegrityAdvocateContext.Provider>
  );
};

export const useIntegrityAdvocate = (): IntegrityAdvocateContextType => {
  const context = useContext(IntegrityAdvocateContext);
  if (!context) {
    throw new Error(
      "useIntegrityAdvocate must be used within an IntegrityAdvocateProvider"
    );
  }
  return context;
};
