# KduFoot Architecture Overview

This document describes the technical architecture of the KduFoot application, a premium football management SaaS platform.

## Tech Stack

### Frontend (Client)
- **Framework**: React 18 with Vite.
- **UI Library**: HeroUI (NextUI) for high-end components.
- **Styling**: TailwindCSS & Framer Motion for premium animations.
- **Authentication**: Auth0 (OIDC/JWT) for secure user sessions.
- **Data Fetching**: SWR for reactive data fetching and caching.
- **Internationalization**: i18next for multi-language support (FR/EN).

### Backend (Cloudflare Worker)
- **Runtime**: Cloudflare Workers (Edge Computing).
- **Database**: Cloudflare D1 (SQLite at the edge).
- **Caching**: Cloudflare KV for high-performance metadata and details caching.
- **Rate Limiting**: Cloudflare Rate Limiter for DoS protection.
- **Architecture**: Custom Router with middleware-based permission checking.

## Key Architectural Patterns

### 1. Service-Oriented Backend
The worker is organized into specialized services (e.g., `MatchService`, `TournamentService`, `ExerciseService`) following the Single Responsibility Principle. This ensures maintainability and easier testing.

### 2. Scalable Routing & Permissions
A custom `Router` handles HTTP methods, path parameter parsing (e.g., `/api/matches/<id>`), and integrated Auth0 permission checking. Routes are protected via scopes (e.g., `matches:create`).

### 3. Progressive Web App (PWA)
The application is fully PWA-compatible, featuring a custom install flow for both iOS (native hints) and Android, ensuring a mobile-first experience.

### 4. Robust Error Handling
- **Worker side**: `ErrorHandler` utility maps exceptions to clean HTTP status codes (403, 404, 429, 500), preventing sensitive leakages.
- **Client side**: `ErrorView` component provides context-specific premium UI for different error states, enhancing user resilience.

### 5. Multi-Layer Caching Strategy
- **Application Level**: KV stores (e.g., exercise/session details) for under 10ms retrieval.
- **Network Level**: `Cache-Control` headers (Stale-While-Revalidate) optimized for CDN caching.

## Performance Targets
- **CPU Time**: Under 10ms for worker execution.
- **Lighthouse Scores**: Targeting 100/100 in Performance, Accessibility, Best Practices, and SEO.
