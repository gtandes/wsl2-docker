/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { directus } from "../utils/directus";
import { UserRole } from "../types/roles";
import { useRouter } from "next/router";
import { useApolloClient } from "@apollo/client";

interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token: string;
  agencies: Agency[];
}

interface Agency {
  id: string;
  custom_allowed_attempts_exams: number | undefined;
}

interface ContextProps {
  currentUser?: CurrentUser;
  loaded: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  redirects: (role: string) => Promise<void>;
}

const AuthContext = createContext<ContextProps>({} as ContextProps);

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  let hasRun = false;
  const [currentUser, setCurrentUser] = useState<CurrentUser>();
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const apolloClient = useApolloClient();

  const authenticate = useCallback(async () => {
    try {
      const token = await directus.auth.token;
      if (token) {
        const profile = await directus.users.me.read({
          fields: [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "agencies.status",
            "agencies.agencies_id.id",
            "agencies.status",
            "agencies.agencies_id.custom_allowed_attempts_exams",
          ],
        });

        const activeAgencies = profile.agencies?.filter(
          (a: any) => a.status === "active"
        );

        const user = {
          id: profile.id!,
          email: profile.email!,
          firstName: profile.first_name!,
          lastName: profile.last_name!,
          role: profile.role as UserRole,
          token,
          agencies:
            activeAgencies &&
            activeAgencies?.length &&
            activeAgencies?.map(
              (agency: { agencies_id: {} }) => agency.agencies_id
            ),
        };

        setCurrentUser(user);

        return user;
      }
    } catch (error) {
      setCurrentUser(undefined);
    } finally {
      setLoaded(true);
    }
  }, []);

  const redirects = async (role: string) => {
    const { logoutAction } = router.query;

    const isClinician = role === UserRole.Clinician;
    const isManager = role === UserRole.UsersManager;
    const isAdmin =
      role === UserRole.AgencyUser ||
      role === UserRole.HSHAdmin ||
      role === UserRole.Developer ||
      role === UserRole.CredentialingUser;

    const defaultRedirect = async () => {
      if (isClinician) {
        await router.push("/clinician");
        return;
      } else if (role === UserRole.PlatformUser) {
        await router.push("/admin/bullhorn/iframe");
        return;
      } else {
        await router.push("/admin/users");
        return;
      }
    };

    if (router.query.redirectUrl) {
      switch (true) {
        case router.query.redirectUrl.indexOf("clinician") > -1 && isClinician:
          await router.push(router.query.redirectUrl as string);
          return;
        case router.query.redirectUrl.indexOf("admin") > -1 &&
          (isAdmin || isManager):
          await router.push(router.query.redirectUrl as string);
          return;
        default:
          await defaultRedirect();
          return;
      }
    }

    defaultRedirect();
  };

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await directus.auth.login({
        email,
        password,
      });
      if (auth) {
        const user = await authenticate();

        if (!user) {
          throw new Error();
        }

        if (
          ![UserRole.HSHAdmin, UserRole.Developer].includes(user.role) &&
          !user.agencies
        ) {
          throw new Error("inactive");
        }

        await redirects(user?.role);
      }
    },
    [authenticate, router]
  );

  const logout = useCallback(async () => {
    try {
      const token = await directus.auth.token;
      if (token) {
        await directus.auth.logout();
        await apolloClient.clearStore();
      }
    } catch (error) {
      console.error(error);
    }
    setCurrentUser(undefined);
  }, []);

  useEffect(() => {
    if (!hasRun) {
      authenticate();
    }
    return () => {
      hasRun = true;
    };
  }, [hasRun]);

  const value = React.useMemo<ContextProps>(
    () => ({
      currentUser,
      login,
      logout,
      loaded,
      redirects,
    }),
    [currentUser, login, logout, loaded, redirects]
  );

  return <AuthContext.Provider value={value} {...props} />;
};
