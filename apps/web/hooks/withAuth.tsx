import { useRouter } from "next/router";
import type React from "react";
import { useEffect } from "react";
import { Spinner } from "../components/Spinner";
import { useAuth } from "./useAuth";
import { UserRole } from "../types/roles";

export function withAuth(Comp: React.FC, roles?: Array<UserRole>) {
  return ((props) => {
    const { currentUser, loaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loaded) return;
      if (!currentUser || (roles && !roles.includes(currentUser.role))) {
        const hasWrongParamId = router.asPath.includes("[");
        if (!hasWrongParamId) {
          router.push(`/?redirectUrl=${router.asPath}`);
        }
      }
    }, [currentUser, router, loaded]);

    if (!loaded || !currentUser) {
      return (
        <div className="mt-5 flex items-center justify-center">
          <Spinner />
        </div>
      );
    }
    return <Comp {...props} />;
  }) as React.FC;
}
