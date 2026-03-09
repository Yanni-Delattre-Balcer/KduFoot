/**
 * @copyright Copyright (c) 2024-2026 Ronan LE MEILLAT
 * @license AGPL-3.0-or-later
 */

import {
  useAuth0,
  withAuthenticationRequired,
  LogoutOptions as Auth0LogoutOptions,
  RedirectLoginOptions,
} from "@auth0/auth0-react";
import React, { JSX, useCallback, useMemo, useRef } from "react";
import { JWTPayload, jwtVerify } from "jose";
import { addToast } from "@heroui/toast";

import {
  AuthProvider,
  AuthUser,
  TokenOptions,
  LogoutOptions,
  LoginOptions,
  AuthGuardProps,
} from "./auth-provider";

import { getLocalJwkSet } from "@/authentication/utils/jwks";

/**
 * Auth0 implementation of the AuthProvider interface.
 * An 'AuthProvider' is a common pattern to abstract the underlying authentication service
 * (like Auth0, Firebase, or a custom one) so the rest of the app doesn't need to know the details.
 */
export const useAuth0Provider = (): AuthProvider => {
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const login = useCallback(async (options?: LoginOptions): Promise<void> => {
    return loginWithRedirect(options as RedirectLoginOptions);
  }, [loginWithRedirect]);

  const logout = useCallback(async (options?: LogoutOptions): Promise<void> => {
    const auth0Options: Auth0LogoutOptions = {
      ...options,
      logoutParams: {
        returnTo:
          options?.logoutParams?.returnTo ||
          new URL(
            import.meta.env.BASE_URL || "/",
            window.location.origin,
          ).toString(),
        ...options?.logoutParams,
      },
    };

    sessionStorage.clear();
    auth0Logout(auth0Options);

    return Promise.resolve();
  }, [auth0Logout]);

  const getAccessToken = useCallback(async (
    options?: TokenOptions,
  ): Promise<string | null> => {
    try {
      /**
       * 'Audience' identifies the API the token is intended for.
       * 'Scope' identifies the permissions the token should have.
       */
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: options?.audience || import.meta.env.AUTH0_AUDIENCE,
          scope: options?.scope || import.meta.env.AUTH0_SCOPE,
        },
        ...options,
      });

      return token;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Error getting access token:", error);

      // If the error indicates we need to re-authenticate (e.g. missing refresh token, login required)
      // we force a redirect to login.
      const errorMessage = error?.message?.toLowerCase() || "";
      if (
        errorMessage.includes("login_required") ||
        errorMessage.includes("missing refresh token") ||
        errorMessage.includes("consent_required")
      ) {
        console.warn("Terminal authentication error detected. Redirecting to login...");
        login();
        return null;
      }

      addToast({
        title: "Session expirée",
        description: "Veuillez vous deconnecter et vous reconnecter s'il vous plait",
        variant: 'flat',
        color: 'danger'
      });
      return null;
    }
  }, [getAccessTokenSilently, login]);

  // In-memory cache for permission checks keyed by `${permission}:${accessToken}`
  const permissionCheckCache = useMemo(() => new Map<string, boolean>(), []);

  const hasPermission = useCallback(
    async (permission: string): Promise<boolean> => {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          return false;
        }

        const cacheKey = `${permission}:${accessToken}`;

        if (permissionCheckCache.has(cacheKey)) {
          return permissionCheckCache.get(cacheKey) as boolean;
        }

        const localSet = await getLocalJwkSet(import.meta.env.AUTH0_DOMAIN);

        /**
         * We verify the JWT (JSON Web Token) locally to check if it contains
         * the specific permission we need. This is faster than calling an API.
         */
        const joseResult = await jwtVerify(accessToken, localSet, {
          issuer: `https://${import.meta.env.AUTH0_DOMAIN}/`,
          audience: import.meta.env.AUTH0_AUDIENCE,
        });

        const payload = joseResult.payload as JWTPayload;
        const result =
          Array.isArray(payload.permissions) &&
          payload.permissions.includes(permission);

        /**
         * 'permissionCheckCache' stores the result so we don't have to 
         * verify the JWT again for the same permission and token.
         */
        permissionCheckCache.set(cacheKey, result);

        return result;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error checking permission:", error);

        return false;
      }
    },
    [getAccessToken, permissionCheckCache],
  );

  // Simple in-memory request cache to dedupe identical requests while active
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());

  const getJson = useCallback(
    async (url: string): Promise<any> => {
      try {
        const accessToken = await getAccessToken();

        const cacheKey = `${accessToken}:${url}`;

        if (requestCacheRef.current.has(cacheKey)) {
          return await requestCacheRef.current.get(cacheKey)!;
        }

        const promise = (async () => {
          const apiResponse = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text().catch(() => "");
            let errorJson: any = {};
            try {
              if (apiResponse.headers.get("Content-Type")?.includes("application/json")) {
                errorJson = JSON.parse(errorText);
              }
            } catch (e) {
              // Ignore parse error
            }
            throw new Error(errorJson.error || `HTTP error! status: ${apiResponse.status}`);
          }

          const contentType = apiResponse.headers.get("Content-Type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid response format: Expected JSON");
          }

          return await apiResponse.json();
        })();

        // store the in-flight promise to dedupe concurrent calls
        requestCacheRef.current.set(cacheKey, promise);

        try {
          const data = await promise;

          // keep the resolved promise in cache (could also replace by data)
          requestCacheRef.current.set(cacheKey, Promise.resolve(data));

          return data;
        } catch (err) {
          // remove failed promise from cache
          requestCacheRef.current.delete(cacheKey);
          throw err;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching JSON:", error);
        throw error;
      }
    },
    [getAccessToken],
  );

  const postJson = useCallback(
    async (url: string, data: any): Promise<any> => {
      try {
        const accessToken = await getAccessToken();

        const apiResponse = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => "");
          let errorJson: any = {};
          try {
            if (apiResponse.headers.get("Content-Type")?.includes("application/json")) {
              errorJson = JSON.parse(errorText);
            }
          } catch (e) { /* ignore */ }
          throw new Error(errorJson.error || `HTTP error! status: ${apiResponse.status}`);
        }

        const contentType = apiResponse.headers.get("Content-Type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format: Expected JSON");
        }

        return await apiResponse.json();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error posting JSON:", error);
        throw error;
      }
    },
    [getAccessToken],
  );

  const patchJson = useCallback(
    async (url: string, data: any): Promise<any> => {
      try {
        const accessToken = await getAccessToken();

        const apiResponse = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => "");
          let errorJson: any = {};
          try {
            if (apiResponse.headers.get("Content-Type")?.includes("application/json")) {
              errorJson = JSON.parse(errorText);
            }
          } catch (e) { /* ignore */ }
          throw new Error(errorJson.error || `HTTP error! status: ${apiResponse.status}`);
        }

        const contentType = apiResponse.headers.get("Content-Type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format: Expected JSON");
        }

        return await apiResponse.json();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error patching JSON:", error);
        throw error;
      }
    },
    [getAccessToken],
  );

  const deleteJson = useCallback(
    async (url: string): Promise<any> => {
      try {
        const accessToken = await getAccessToken();

        const apiResponse = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => "");
          let errorJson: any = {};
          try {
            if (apiResponse.headers.get("Content-Type")?.includes("application/json")) {
              errorJson = JSON.parse(errorText);
            }
          } catch (e) { /* ignore */ }
          throw new Error(errorJson.error || `HTTP error! status: ${apiResponse.status}`);
        }

        const contentType = apiResponse.headers.get("Content-Type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format: Expected JSON");
        }

        return await apiResponse.json();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error deleting JSON:", error);
        throw error;
      }
    },
    [getAccessToken],
  );

  const putJson = useCallback(
    async (url: string, data: any): Promise<any> => {
      try {
        const accessToken = await getAccessToken();

        const apiResponse = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => "");
          let errorJson: any = {};
          try {
            if (apiResponse.headers.get("Content-Type")?.includes("application/json")) {
              errorJson = JSON.parse(errorText);
            }
          } catch (e) { /* ignore */ }
          throw new Error(errorJson.error || `HTTP error! status: ${apiResponse.status}`);
        }

        const contentType = apiResponse.headers.get("Content-Type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format: Expected JSON");
        }

        return await apiResponse.json();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error putting JSON:", error);
        throw error;
      }
    },
    [getAccessToken],
  );

  // Memoize the returned API surface so consumers receive stable function identities
  return useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user: user as AuthUser,
      login,
      logout,
      getAccessToken,
      hasPermission,
      getJson,
      postJson,
      putJson,
      patchJson,
      deleteJson,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getAccessToken,
      hasPermission,
      getJson,
      postJson,
      putJson,
      patchJson,
      deleteJson,
    ],
  );
};

/**
 * HOC that protects routes requiring authentication with Auth0
 * @param component - The component to protect
 * @param options - Authentication options
 */
export const withAuth0Authentication = (
  component: React.FC,
  options?: { onRedirecting?: () => JSX.Element },
) => {
  return withAuthenticationRequired(component, options);
};

/**
 * Authentication Guard component specific to Auth0
 */
export const Auth0AuthenticationGuard: React.FC<AuthGuardProps> = ({
  component,
  onRedirecting,
}) => {
  const Component = withAuth0Authentication(component, {
    onRedirecting,
  });

  return <Component />;
};
