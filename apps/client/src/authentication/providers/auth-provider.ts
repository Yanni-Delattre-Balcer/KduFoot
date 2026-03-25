/**
 * @copyright Copyright (c) 2024-2026 Ronan LE MEILLAT
 * @license AGPL-3.0-or-later
 */

import { ReactNode, FC, JSX } from "react";

/**
 * Interface for the common user properties across all auth providers
 */
export interface AuthUser {
  name?: string;
  nickname?: string;
  email?: string;
  sub?: string;
  picture?: string;
  family_name?: string;
  given_name?: string;
  [key: string]: unknown;
}

/**
 * Interface for token options
 */
export interface TokenOptions {
  audience?: string;
  scope?: string;
  [key: string]: unknown;
}

/**
 * Interface for logout options
 */
export interface LogoutOptions {
  logoutParams?: {
    returnTo?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Interface for login options
 */
export interface LoginOptions {
  [key: string]: unknown;
}

/**
 * Core interface that all authentication providers must implement
 */
export interface AuthProvider {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;

  // Core authentication methods
  login(options?: LoginOptions): Promise<void>;
  logout(options?: LogoutOptions): Promise<void>;
  getAccessToken(options?: TokenOptions): Promise<string | null>;

  // Permission handling
  hasPermission(permission: string): Promise<boolean>;

  // API interaction helpers
  getJson<T = unknown>(url: string): Promise<T>;
  postJson<T = unknown>(url: string, data: unknown): Promise<T>;
  putJson<T = unknown>(url: string, data: unknown): Promise<T>;
  patchJson<T = unknown>(url: string, data: unknown): Promise<T>;
  deleteJson<T = unknown>(url: string): Promise<T>;
}

/**
 * Provider configuration interface
 */
export interface AuthProviderConfig {
  domain: string;
  clientId: string;
  redirectUri: string;
  audience?: string;
  scope?: string;
  jwksEndpoint?: string;
  tokenIssuer?: string;
  [key: string]: unknown;
}

/**
 * Interface for components requiring authentication
 */
export interface WithAuthenticationOptions {
  onRedirecting?: () => JSX.Element;
  returnTo?: string | (() => string);
}

/**
 * Interface for authentication guard components
 */
export interface AuthGuardProps {
  component: FC;
  onRedirecting?: () => JSX.Element;
}

/**
 * Interface for permission-based authentication guard
 */
export interface AuthPermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Factory function type for creating authentication providers
 */
export type AuthProviderFactory = (config: AuthProviderConfig) => AuthProvider;
