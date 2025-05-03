import { createContext, useContext, useEffect, useState } from "react";
import { useGetFeatureFlagsQuery } from "api";

interface FeatureFlagsContextType {
  flags: Record<string, boolean>;
  loading: boolean;
  error?: string;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(
  undefined
);

export const FeatureFlagsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { data, loading, error } = useGetFeatureFlagsQuery();
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data?.feature_flags) {
      const flagsMap: Record<string, boolean> = {};
      data.feature_flags.forEach(({ flag_key, enabled }) => {
        flagsMap[flag_key] = enabled;
      });
      setFlags(flagsMap);
    }
  }, [data]);

  return (
    <FeatureFlagsContext.Provider
      value={{ flags, loading, error: error?.message }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider"
    );
  }
  return context;
};
