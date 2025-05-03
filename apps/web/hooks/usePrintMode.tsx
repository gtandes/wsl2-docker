import { useCallback, useEffect } from "react";

interface Config {
  onClose?: () => void;
}

export const usePrintMode = (config?: Config) => {
  const onAfterPrint = useCallback(() => {
    if (config?.onClose) config.onClose();
  }, [config]);

  useEffect(() => {
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [onAfterPrint]);

  const print = useCallback(() => {
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  return {
    print,
  };
};
