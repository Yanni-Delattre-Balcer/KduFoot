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
import React, { Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { SiteLoading } from "./components/site-loading";
import {
  AuthenticationGuard,
  useAuth,
  UserSync,
  useUser,
  BlockedPage,
} from "./authentication";
import { UnifiedOnboarding } from "./components/unified-onboarding";
import { ErrorBoundary } from "./components/error-boundary";
import ScrollToTop from "./components/scroll-to-top";
const IndexPage = React.lazy(() => import("@/pages/index"));
const ApiPage = React.lazy(() => import("@/pages/api"));
const AboutPage = React.lazy(() => import("@/pages/about"));
const ThankYouPage = React.lazy(() => import("@/pages/thank-you"));
const GDPRPage = React.lazy(() => import("@/pages/gdpr"));
const ExercisesPage = React.lazy(() => import("@/pages/exercises"));
const ExerciseDetailsPage = React.lazy(
  () => import("@/pages/exercises/details"),
);
const ExerciseEditPage = React.lazy(() => import("@/pages/exercises/edit"));
const SessionPlannerPage = React.lazy(() => import("@/pages/sessions/planner"));
const SessionDetailsPage = React.lazy(() => import("@/pages/sessions/details"));
const SessionEditPage = React.lazy(() => import("@/pages/sessions/edit"));
const MatchDetailsPage = React.lazy(() => import("@/pages/matches/details"));
const MatchEditPage = React.lazy(() => import("@/pages/matches/edit"));
const MatchesPage = React.lazy(() => import("@/pages/matches"));
const DashboardPage = React.lazy(() => import("@/pages/dashboard/index"));
const FavoritesPage = React.lazy(() => import("@/pages/favorites"));
const TrainingPage = React.lazy(() => import("@/pages/training"));
const PricingPage = React.lazy(() => import("@/pages/pricing/index"));
const BlogPage = React.lazy(() => import("@/pages/blog"));
const UsersAndPermissionsPage = React.lazy(
  () => import("@/pages/admin/users-and-permissions"),
);
const AccountPageLazy = React.lazy(() => import("@/pages/account"));
const PageNotFound = React.lazy(() =>
  import("./pages/404").then((m) => ({ default: m.PageNotFound })),
);
const OfflineStatus = React.lazy(() =>
  import("./components/offline-status").then((m) => ({
    default: m.OfflineStatus,
  })),
);

import { TrainingProvider } from "@/contexts/training-context";
import { showVideoAnalysis } from "@/config/site";

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.98, y: -10 }}
    initial={{ opacity: 0, scale: 0.98, y: 10 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
  >
    {children}
  </motion.div>
);

function App() {
  const { isBlocked, isLoading: userLoading, user, blockReason } = useUser();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Mobile Redirection Logic (SEO & Auth0 fix)
  useEffect(() => {
    const hostname = window.location.hostname;

    // Redirect if it's not the official domain (and not local dev)
    if (
      hostname !== "kdufoot.com" &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !hostname.includes("192.168.")
    ) {
      window.location.replace(
        "https://kdufoot.com" +
          window.location.pathname +
          window.location.search,
      );
    }
  }, []);

  // 1. PRIORITÉ ABSOLUE : NUCLEAR GUARD (Court-circuit immédiat)
  if (isBlocked) {
    return <BlockedPage isBlocked={true} reason={blockReason} />;
  }

  // 2. CHARGEMENT / ÉTANCHÉITÉ :
  // On bloque le rendu si on attend l'auth.
  // Si on est authentifié, on exige d'avoir un profil 'user' chargé AVANT de montrer le site.
  // Cela empêche d'afficher le Dashboard si la requête context échoue (401/403).
  if (authLoading || (isAuthenticated && userLoading && !user)) {
    return <SiteLoading />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<SiteLoading />}>
        <TrainingProvider>
          <OfflineStatus />
          <ScrollToTop />
          <UserSync />
          <UnifiedOnboarding />
          <AnimatePresence mode="wait">
            <Routes key={location.pathname} location={location}>
              <Route
                element={
                  <PageWrapper>
                    <IndexPage />
                  </PageWrapper>
                }
                path="/"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={ApiPage} />
                  </PageWrapper>
                }
                path="/api"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={PricingPage} />
                  </PageWrapper>
                }
                path="/pricing"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={BlogPage} />
                  </PageWrapper>
                }
                path="/blog"
              />
              <Route
                element={
                  <PageWrapper>
                    <AboutPage />
                  </PageWrapper>
                }
                path="/about"
              />
              <Route
                element={
                  <PageWrapper>
                    <ThankYouPage />
                  </PageWrapper>
                }
                path="/remerciements"
              />
              <Route
                element={
                  <PageWrapper>
                    <GDPRPage />
                  </PageWrapper>
                }
                path="/gdpr"
              />
              <Route
                element={
                  <PageWrapper>
                    <PageNotFound />
                  </PageWrapper>
                }
                path="*"
              />
              {showVideoAnalysis && (
                <>
                  <Route
                    element={
                      <PageWrapper>
                        <ExercisesPage />
                      </PageWrapper>
                    }
                    path="/exercises"
                  />
                  <Route
                    element={
                      <PageWrapper>
                        <TrainingPage />
                      </PageWrapper>
                    }
                    path="/training"
                  />
                </>
              )}
              <Route
                element={
                  <PageWrapper>
                    <FavoritesPage />
                  </PageWrapper>
                }
                path="/favorites"
              />
              {showVideoAnalysis && (
                <>
                  <Route
                    element={
                      <PageWrapper>
                        <AuthenticationGuard component={ExerciseEditPage} />
                      </PageWrapper>
                    }
                    path="/exercises/new"
                  />
                  <Route
                    element={
                      <PageWrapper>
                        <AuthenticationGuard component={ExerciseEditPage} />
                      </PageWrapper>
                    }
                    path="/exercises/:id/edit"
                  />
                  <Route
                    element={
                      <PageWrapper>
                        <AuthenticationGuard component={ExerciseDetailsPage} />
                      </PageWrapper>
                    }
                    path="/exercises/:id"
                  />
                </>
              )}
              <Route
                element={
                  <PageWrapper>
                    <SessionPlannerPage />
                  </PageWrapper>
                }
                path="/sessions"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={SessionEditPage} />
                  </PageWrapper>
                }
                path="/sessions/new"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={SessionEditPage} />
                  </PageWrapper>
                }
                path="/sessions/:id/edit"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={SessionDetailsPage} />
                  </PageWrapper>
                }
                path="/sessions/:id"
              />
              <Route
                element={
                  <PageWrapper>
                    <DashboardPage />
                  </PageWrapper>
                }
                path="/dashboard"
              />
              <Route
                element={
                  <PageWrapper>
                    <MatchesPage />
                  </PageWrapper>
                }
                path="/matches"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={MatchEditPage} />
                  </PageWrapper>
                }
                path="/matches/new"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={MatchEditPage} />
                  </PageWrapper>
                }
                path="/matches/:id/edit"
              />
              <Route
                element={
                  <PageWrapper>
                    <MatchDetailsPage />
                  </PageWrapper>
                }
                path="/matches/:id"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={AccountPageLazy} />
                  </PageWrapper>
                }
                path="/account"
              />
              <Route
                element={
                  <PageWrapper>
                    <AuthenticationGuard component={UsersAndPermissionsPage} />
                  </PageWrapper>
                }
                path="/admin/users"
              />
            </Routes>
          </AnimatePresence>
        </TrainingProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
