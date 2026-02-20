/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { githubPagesSpa } from "@sctg/vite-plugin-github-pages-spa";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const _package = require("./package.json");

/**
 * Package.json type definition for React project
 *
 * Provides TypeScript typing for package.json structure with
 * common fields used in React applications
 */
export type PackageJson = {
  name: string;
  private: boolean;
  version: string;
  type: string;
  scripts: {
    dev: string;
    build: string;
    lint: string;
    "preview:env": string;
    [key: string]: string;
  };
  dependencies: {
    react: string;
    "react-dom": string;
    "react-router-dom": string;
    [key: string]: string;
  };
  devDependencies: {
    typescript: string;
    eslint: string;
    vite: string;
    [key: string]: string;
  };
};

const packageJson: PackageJson = _package;

/**
 * Extract dependencies with a specific vendor prefix
 *
 * @param packageJson - The package.json object
 * @param vendorPrefix - Vendor namespace prefix (e.g. "@heroui")
 * @returns Array of dependency names matching the vendor prefix
 *
 * Used for chunk optimization in the build configuration
 */
export function extractPerVendorDependencies(
  packageJson: PackageJson,
  vendorPrefix: string,
): string[] {
  const dependencies = Object.keys(packageJson.dependencies || {});

  return dependencies.filter((dependency) =>
    dependency.startsWith(`${vendorPrefix}/`),
  );
}

/**
 * Vite configuration
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");

  console.warn(
    `Launching Vite with\nAUTH0_DOMAIN: ${env.AUTH0_DOMAIN}\nAUTH0_CLIENT_ID: ${env.AUTH0_CLIENT_ID}\nAUTH0_AUDIENCE: ${env.AUTH0_AUDIENCE}\nAUTH0_SCOPE: ${env.AUTH0_SCOPE}\nAPI_BASE_URL: ${env.API_BASE_URL}`,
  );

  return {
    envDir: "../../",
    base: env.VITE_BASE_PATH || "/",
    define: {
      // Get the AUthentication provider type from environment variables
      "import.meta.env.AUTHENTICATION_PROVIDER_TYPE": JSON.stringify(
        env.AUTHENTICATION_PROVIDER_TYPE || "auth0",
      ),
      // Auth0 environment variables
      "import.meta.env.AUTH0_DOMAIN": JSON.stringify(env.AUTH0_DOMAIN),
      "import.meta.env.AUTH0_CLIENT_ID": JSON.stringify(
        env.AUTH0_CLIENT_ID,
      ),
      "import.meta.env.AUTH0_AUDIENCE": JSON.stringify(
        env.AUTH0_AUDIENCE,
      ),
      "import.meta.env.AUTH0_SCOPE": JSON.stringify(env.AUTH0_SCOPE),
      "import.meta.env.API_BASE_URL": JSON.stringify(env.API_BASE_URL),
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL || ""),
      // Dex environment variables
      "import.meta.env.DEX_AUTHORITY": JSON.stringify(env.DEX_AUTHORITY),
      "import.meta.env.DEX_CLIENT_ID": JSON.stringify(env.DEX_CLIENT_ID),
      "import.meta.env.DEX_REDIRECT_URI": JSON.stringify(
        env.DEX_REDIRECT_URI,
      ),
      "import.meta.env.DEX_SCOPE": JSON.stringify(env.DEX_SCOPE),
      "import.meta.env.DEX_AUDIENCE": JSON.stringify(env.DEX_AUDIENCE),
      "import.meta.env.DEX_TOKEN_ISSUER": JSON.stringify(
        env.DEX_TOKEN_ISSUER,
      ),
      "import.meta.env.DEX_JWKS_ENDPOINT": JSON.stringify(
        env.DEX_JWKS_ENDPOINT,
      ),
      "import.meta.env.DEX_DOMAIN": JSON.stringify(env.DEX_DOMAIN),
      "import.meta.env.AUTH0_CACHE_DURATION_S": JSON.stringify(
        env.AUTH0_CACHE_DURATION_S || "300",
      ),
    },
    plugins: [react(), tsconfigPaths(), tailwindcss(), githubPagesSpa()],
    build: {
      assetsInlineLimit: 1024,
      sourcemap: true,
      rollupOptions: {
        output: {
          assetFileNames: `assets/${packageJson.name}-[name]-[hash][extname]`,
          entryFileNames: `js/${packageJson.name}-[hash].js`,
          chunkFileNames: `js/${packageJson.name}-[hash].js`,
          manualChunks: {
            react: [
              "react",
              "react-dom",
              "react-router-dom",
              "react-i18next",
              "i18next",
              "i18next-http-backend",
            ],
            heroui: extractPerVendorDependencies(packageJson, "@heroui"),
            auth0: extractPerVendorDependencies(packageJson, "@auth0"),
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8787',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
