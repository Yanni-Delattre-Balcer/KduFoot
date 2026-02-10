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
import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteLoading } from "./components/site-loading";
import { AuthenticationGuard, useAuth, UserSync } from "./authentication";
import { PageNotFound } from "./pages/404";

import IndexPage from "@/pages/index";
import ApiPage from "@/pages/api";
import PricingPage from "@/pages/pricing";
import BlogPage from "@/pages/blog";
import AboutPage from "@/pages/about";
import ExercisesPage from "@/pages/exercises";
import ExerciseDetailsPage from "@/pages/exercises/details";
import ExerciseEditPage from "@/pages/exercises/edit";
import SessionPlannerPage from "@/pages/sessions/planner";
import SessionDetailsPage from "@/pages/sessions/details";
import SessionEditPage from "@/pages/sessions/edit";
import MatchDetailsPage from "@/pages/matches/details";
import MatchEditPage from "@/pages/matches/edit";
import MatchesPage from "@/pages/matches";
import FavoritesPage from "@/pages/favorites";

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SiteLoading />;
  }

  return (
    <Suspense fallback={<SiteLoading />}>
      <UserSync />
      <Routes>
        <Route element={<IndexPage />} path="/" />
        <Route
          element={<AuthenticationGuard component={ApiPage} />}
          path="/api"
        />
        <Route
          element={<AuthenticationGuard component={PricingPage} />}
          path="/pricing"
        />
        <Route
          element={<AuthenticationGuard component={BlogPage} />}
          path="/blog"
        />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<PageNotFound />} path="*" />
        <Route
          element={<AuthenticationGuard component={ExercisesPage} />}
          path="/exercises"
        />
        <Route
          element={<AuthenticationGuard component={FavoritesPage} />}
          path="/favorites"
        />
        <Route
          element={<AuthenticationGuard component={ExerciseEditPage} />}
          path="/exercises/new"
        />
        <Route
          element={<AuthenticationGuard component={ExerciseEditPage} />}
          path="/exercises/:id/edit"
        />
        <Route
          element={<AuthenticationGuard component={ExerciseDetailsPage} />}
          path="/exercises/:id"
        />
        <Route
          element={<AuthenticationGuard component={SessionPlannerPage} />}
          path="/sessions"
        />
        <Route
          element={<AuthenticationGuard component={SessionEditPage} />}
          path="/sessions/new"
        />
        <Route
          element={<AuthenticationGuard component={SessionEditPage} />}
          path="/sessions/:id/edit"
        />
        <Route
          element={<AuthenticationGuard component={SessionDetailsPage} />}
          path="/sessions/:id"
        />
        <Route
          element={<AuthenticationGuard component={MatchesPage} />}
          path="/matches"
        />
        <Route
          element={<AuthenticationGuard component={MatchEditPage} />}
          path="/matches/new"
        />
        <Route
          element={<AuthenticationGuard component={MatchEditPage} />}
          path="/matches/:id/edit"
        />
        <Route
          element={<AuthenticationGuard component={MatchDetailsPage} />}
          path="/matches/:id"
        />
      </Routes>
    </Suspense>
  );
}

export default App;
