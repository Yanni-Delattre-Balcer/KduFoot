# ANALYSE TECHNIQUE - KDUFOOT
## Reverse Engineering & Plan de Migration vers Template SCTG Development de Ronan Le Meillat

**Version:** 2.0  
**Date:** 08 février 2026  
**Template de base:** [vite-react-heroui-auth0-template](https://github.com/sctg-development/vite-react-heroui-auth0-template)  
**Objectif:** Migration complète vers architecture moderne Turborepo/Cloudflare Workers/React/Auth0

---

## Table des Matières

1. [Présentation Générale du Projet](#1-présentation-générale-du-projet)
2. [Mapping des Fonctionnalités vers la Nouvelle Architecture](#2-mapping-des-fonctionnalités-vers-la-nouvelle-architecture)
3. [Structure des Composants React](#3-structure-des-composants-react)
4. [Schéma de Base de Données D1](#4-schéma-de-base-de-données-d1)
5. [Types TypeScript](#5-types-typescript)
6. [Plan de Migration Détaillé](#6-plan-de-migration-détaillé)
7. [Commandes Turborepo Personnalisées](#7-commandes-turborepo-personnalisées)
8. [Différences Clés Template vs Maquette Actuelle](#8-différences-clés-template-vs-maquette-actuelle)
9. [Estimation des Coûts](#9-estimation-des-coûts-free-tier-cloudflare)
10. [Checklist Finale de Migration](#10-checklist-finale-de-migration)
11. [Ressources & Liens Utiles](#11-ressources--liens-utiles)
12. [Conclusion](#12-conclusion)
13. [Système de Permissions Granulaires KduFoot](#13-système-de-permissions-granulaires-kdufoot)
14. [Système d'Internationalisation (i18n)](#14-système-dinternationalisation-i18n)

---

## 1. PRÉSENTATION GÉNÉRALE DU PROJET

### 1.1 Contexte et Objectif

**KduFoot** est une plateforme web destinée aux entraîneurs de football permettant :
- L'analyse automatique de vidéos d'entraînement via IA (Google Gemini)
- La génération de fiches d'exercices structurées avec schémas tactiques SVG
- La gestion d'une bibliothèque d'exercices personnelle
- La planification de séances d'entraînement
- La mise en relation entre clubs pour des matchs amicaux

### 1.2 Architecture Cible (Template SCTG Development)

```
kdufoot/                                    # Root monorepo
├── package.json                            # Turborepo + workspaces
├── turbo.json                              # Configuration Turborepo
├── .yarnrc.yml                             # Yarn 4 configuration
├── yarn.lock                               # Lockfile unifié
├── .env                                    # Variables d'environnement
│
├── apps/
│   ├── client/                             # Application React
│   │   ├── src/
│   │   │   ├── authentication/             # Système Auth0
│   │   │   │   ├── providers/
│   │   │   │   │   ├── auth-provider.ts
│   │   │   │   │   ├── auth0-provider.tsx
│   │   │   │   │   └── use-auth.tsx
│   │   │   │   ├── auth-components.tsx
│   │   │   │   ├── auth-root.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── components/                # Composants UI réutilisables
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── icons.tsx
│   │   │   │   ├── theme-switch.tsx
│   │   │   │   ├── language-switch.tsx
│   │   │   │   ├── cookie-consent.tsx
│   │   │   │   ├── site-loading.tsx
│   │   │   │   └── primitives.ts
│   │   │   │
│   │   │   ├── components/kdufoot/        # Composants spécifiques KduFoot
│   │   │   │   ├── video/
│   │   │   │   │   ├── video-analysis-form.tsx
│   │   │   │   │   ├── platform-detector.tsx
│   │   │   │   │   └── progress-bar.tsx
│   │   │   │   ├── exercises/
│   │   │   │   │   ├── exercise-card.tsx
│   │   │   │   │   ├── exercise-filters.tsx
│   │   │   │   │   ├── exercise-modal.tsx
│   │   │   │   │   ├── theme-badge.tsx
│   │   │   │   │   └── svg-viewer.tsx
│   │   │   │   ├── matches/
│   │   │   │   │   ├── match-create-form.tsx
│   │   │   │   │   ├── match-search-filters.tsx
│   │   │   │   │   ├── match-card.tsx
│   │   │   │   │   ├── siret-lookup.tsx
│   │   │   │   │   └── club-validation-card.tsx
│   │   │   │   ├── training/
│   │   │   │   │   ├── session-builder.tsx
│   │   │   │   │   ├── exercise-list.tsx
│   │   │   │   │   ├── adaptation-form.tsx
│   │   │   │   │   ├── session-timer.tsx
│   │   │   │   │   └── drag-drop-zone.tsx
│   │   │   │   ├── pricing/
│   │   │   │   │   └── permission-gate.tsx
│   │   │   │   └── common/
│   │   │   │       ├── skeleton-card.tsx
│   │   │   │       ├── certified-badge.tsx
│   │   │   │       └── toast-notifications.tsx
│   │   │   │
│   │   │   ├── config/                    # Configuration
│   │   │   │   ├── site.ts                # Configuration du site
│   │   │   │   └── permissions-matrix.ts  # Matrice permissions
│   │   │   │
│   │   │   ├── contexts/                  # React Contexts
│   │   │   │   ├── cookie-consent-context.tsx
│   │   │   │   ├── exercises-context.tsx
│   │   │   │   ├── session-context.tsx
│   │   │   │   └── matches-context.tsx
│   │   │   │
│   │   │   ├── hooks/                     # Custom hooks
│   │   │   │   ├── use-scroll-top.tsx
│   │   │   │   ├── use-permissions.ts
│   │   │   │   ├── use-exercises.ts
│   │   │   │   ├── use-session.ts
│   │   │   │   ├── use-matches.ts
│   │   │   │   ├── use-siret-lookup.ts
│   │   │   │   └── use-translated-enum.ts
│   │   │   │
│   │   │   ├── layouts/                   # Layouts
│   │   │   │   └── default.tsx
│   │   │   │
│   │   │   ├── locales/                   # i18n
│   │   │   │   ├── base/                  # Namespace "base"
│   │   │   │   │   ├── en-US.json
│   │   │   │   │   ├── fr-FR.json
│   │   │   │   │   ├── es-ES.json
│   │   │   │   │   ├── zh-CN.json
│   │   │   │   │   ├── ar-SA.json
│   │   │   │   │   └── he-IL.json
│   │   │   │   └── kdufoot/               # Namespace "kdufoot"
│   │   │   │       ├── en-US.json
│   │   │   │       ├── fr-FR.json
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── pages/                     # Pages React
│   │   │   │   ├── index.tsx              # Page d'accueil
│   │   │   │   ├── library.tsx
│   │   │   │   ├── favorites.tsx
│   │   │   │   ├── matches.tsx
│   │   │   │   ├── training.tsx
│   │   │   │   ├── history.tsx
│   │   │   │   ├── pricing.tsx
│   │   │   │   ├── about.tsx
│   │   │   │   └── 404.tsx
│   │   │   │
│   │   │   ├── services/                  # Services API
│   │   │   │   ├── api.ts
│   │   │   │   ├── video.service.ts
│   │   │   │   ├── exercise.service.ts
│   │   │   │   ├── match.service.ts
│   │   │   │   ├── session.service.ts
│   │   │   │   └── siret.service.ts
│   │   │   │
│   │   │   ├── styles/                    # Styles globaux
│   │   │   │   └── globals.css
│   │   │   │
│   │   │   ├── types/                     # Types TypeScript
│   │   │   │   ├── exercise.types.ts
│   │   │   │   ├── match.types.ts
│   │   │   │   ├── session.types.ts
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── utils/                     # Utilitaires
│   │   │   │   ├── formatting.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── constants.ts
│   │   │   │
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── provider.tsx
│   │   │   └── i18n.ts
│   │   │
│   │   ├── public/
│   │   │   └── assets/
│   │   │
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── cloudflare-worker/                 # Backend Cloudflare Workers
│       ├── src/
│       │   ├── routes/
│       │   │   ├── router.ts
│       │   │   ├── index.ts
│       │   │   ├── auth.ts
│       │   │   ├── videos.ts
│       │   │   ├── exercises.ts
│       │   │   ├── matches.ts
│       │   │   ├── sessions.ts
│       │   │   ├── siret.ts
│       │   │   └── payments.ts
│       │   │
│       │   ├── services/
│       │   │   ├── gemini.service.ts
│       │   │   ├── d1.service.ts
│       │   │   └── r2.service.ts
│       │   │
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── permissions.middleware.ts
│       │   │   └── rate-limit.middleware.ts
│       │   │
│       │   ├── types/
│       │   │   ├── env.d.ts
│       │   │   └── permissions.ts
│       │   │
│       │   ├── auth0.ts
│       │   └── index.ts
│       │
│       ├── migrations/
│       │   ├── 0001_initial.sql
│       │   ├── 0002_add_clubs.sql
│       │   ├── 0003_add_exercises.sql
│       │   ├── 0004_add_matches.sql
│       │   └── 0005_add_sessions.sql
│       │
│       ├── wrangler.jsonc
│       ├── tsconfig.json
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-client.yml
│       └── deploy-worker.yml
│
└── .vscode/
    └── settings.json
```

---

## 2. MAPPING DES FONCTIONNALITÉS VERS LA NOUVELLE ARCHITECTURE

### 2.1 Routes API (Cloudflare Workers)

#### Mapping des Routes KduFoot → Template

| Route Actuelle (Flask) | Nouvelle Route (Worker) | Fichier | Méthode | Permission |
|-------------------------|------------------------|---------|---------|------------|
| `/api/register` | `/api/auth/register` | `routes/auth.ts` | POST | - |
| `/api/login` | `/api/auth/login` | `routes/auth.ts` | POST | - |
| `/api/auth/me` | `/api/auth/me` | `routes/auth.ts` | GET | `read:api` |
| `/add_video` | `/api/videos/analyze` | `routes/videos.ts` | POST | `videos:analyze` |
| `/adapt_session_granular` | `/api/sessions/adapt` | `routes/sessions.ts` | POST | `sessions:adapt` |
| `/api/v2/siret-lookup` | `/api/clubs/lookup` | `routes/siret.ts` | GET | - |
| `/api/clubs/search` | `/api/clubs/search` | `routes/siret.ts` | GET | - |
| `/create-checkout-session` | `/api/payments/checkout` | `routes/payments.ts` | POST | `read:api` |

#### Exemple d'implémentation : `routes/videos.ts`

```typescript
// apps/cloudflare-worker/src/routes/videos.ts
import { Router } from './router';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import type { Env } from '../types/env';

export function setupVideoRoutes(router: Router, env: Env) {
  // POST /api/videos/analyze - Analyse vidéo courte
  router.post('/api/videos/analyze', async (request, params) => {
    const permissionCheck = await checkPermission(
      request, 
      env, 
      Permission.VIDEOS_ANALYZE
    );

    if (!permissionCheck.hasPermission) {
      return Response.json(
        { 
          error: permissionCheck.reason,
          quota: permissionCheck.quota 
        },
        { status: permissionCheck.quota ? 429 : 403 }
      );
    }

    const { url } = await request.json();
    
    // TODO: Téléchargement vidéo vers R2
    // TODO: Appel Gemini API
    // TODO: Stockage exercices dans D1
    
    return Response.json({ 
      success: true,
      quota: permissionCheck.quota 
    });
  });

  // POST /api/videos/analyze/long - Analyse vidéo longue (>5min)
  router.post('/api/videos/analyze/long', async (request, params) => {
    const permissionCheck = await checkPermission(
      request,
      env,
      Permission.VIDEOS_ANALYZE_LONG
    );

    if (!permissionCheck.hasPermission) {
      return Response.json(
        { error: permissionCheck.reason },
        { status: 403 }
      );
    }

    // TODO: Logique d'analyse longue
    
    return Response.json({ success: true });
  });
}
```

### 2.2 Configuration Auth0 pour KduFoot

#### Variables d'environnement (.env à la racine)

```env
# Authentication
AUTHENTICATION_PROVIDER_TYPE=auth0
AUTH0_CLIENT_ID=your-kdufoot-client-id
AUTH0_CLIENT_SECRET=your-kdufoot-client-secret
AUTH0_DOMAIN=kdufoot.eu.auth0.com
AUTH0_SCOPE="openid profile email read:api write:api"
AUTH0_AUDIENCE=https://api.kdufoot.com

# API
API_BASE_URL=http://localhost:8787/api
CORS_ORIGIN=http://localhost:5173

# Permissions
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api

# Google Gemini
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-d1-database-id
```

#### Configuration wrangler.jsonc

```jsonc
// apps/cloudflare-worker/wrangler.jsonc
{
  "name": "kdufoot-api",
  "compatibility_date": "2024-01-01",
  "main": "src/index.ts",
  
  "vars": {
    "ENVIRONMENT": "development",
    "CORS_ORIGIN": "http://localhost:5173"
  },
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kdufoot-db",
      "database_id": "your-database-id"
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "VIDEOS_BUCKET",
      "bucket_name": "kdufoot-videos"
    },
    {
      "binding": "THUMBNAILS_BUCKET",
      "bucket_name": "kdufoot-thumbnails"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

---

## 3. STRUCTURE DES COMPOSANTS REACT

### 3.1 Organisation par Fonctionnalité

#### Composants Video Analysis

```typescript
// apps/client/src/components/kdufoot/video/video-analysis-form.tsx
import { Button, Input } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { PlatformDetector } from "./platform-detector";
import { ProgressBar } from "./progress-bar";

interface VideoAnalysisFormProps {
  onAnalyze: (url: string) => Promise<void>;
  isAnalyzing: boolean;
  progress: number;
}

export const VideoAnalysisForm: React.FC<VideoAnalysisFormProps> = ({
  onAnalyze,
  isAnalyzing,
  progress
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setPlatform(detectPlatform(value));
  };

  return (
    <div className="bg-gradient-to-br from-[#1e3c72] to-[#2a5298] rounded-3xl p-8">
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full p-2">
        <PlatformDetector platform={platform} />
        <Input
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={t('video.urlPlaceholder')}
          className="flex-1"
          disabled={isAnalyzing}
        />
        <Button 
          color="primary" 
          onClick={() => onAnalyze(url)}
          isLoading={isAnalyzing}
        >
          {t('video.analyze')}
        </Button>
      </div>
      
      {isAnalyzing && <ProgressBar progress={progress} />}
    </div>
  );
};
```

#### Composants Exercices

```typescript
// apps/client/src/components/kdufoot/exercises/exercise-card.tsx
import { Card, CardBody, CardFooter, Button, Chip } from "@heroui/react";
import { motion } from "framer-motion";
import { ThemeBadge } from "./theme-badge";
import { SVGViewer } from "./svg-viewer";
import type { Exercise } from "@/types/exercise.types";

interface ExerciseCardProps {
  exercise: Exercise;
  onFavorite: (id: string) => void;
  onAddToTraining: (id: string) => void;
  onAdapt: (id: string) => void;
  isFavorite: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onFavorite,
  onAddToTraining,
  onAdapt,
  isFavorite
}) => {
  const { t } = useTranslation();
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="h-full"
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        <CardBody className="relative overflow-hidden">
          <img 
            src={exercise.thumbnail} 
            alt={exercise.title}
            className="w-full h-48 object-cover rounded-lg"
          />
          
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-b from-slate-900/95 to-slate-900/98 p-4 overflow-y-auto"
            >
              <SVGViewer svgCode={exercise.svg_schema} />
              <div className="mt-3 text-sm text-white/90">
                {exercise.synopsis}
              </div>
            </motion.div>
          )}
          
          <h3 className="font-bold mt-3">{exercise.title}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {exercise.themes.map(theme => (
              <ThemeBadge key={theme} theme={theme} />
            ))}
          </div>
        </CardBody>
        
        <CardFooter className="flex-col gap-2">
          <div className="flex w-full gap-2">
            <Button
              size="sm"
              variant={isFavorite ? "solid" : "bordered"}
              color={isFavorite ? "warning" : "default"}
              onPress={() => onFavorite(exercise.id)}
            >
              {isFavorite ? t('exercise.unfavorite') : t('exercise.favorite')}
            </Button>
            
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={() => onAddToTraining(exercise.id)}
              className="flex-1"
            >
              {t('exercise.addToSession')}
            </Button>
          </div>
          
          <Button
            size="sm"
            color="secondary"
            variant="bordered"
            onPress={() => onAdapt(exercise.id)}
            className="w-full"
          >
            {t('exercise.adapt')}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
```

### 3.2 Gestion d'État avec Context API

```typescript
// apps/client/src/contexts/exercises-context.tsx
import { createContext, useContext, useReducer, useEffect } from "react";
import type { Exercise } from "@/types/exercise.types";
import { exerciseService } from "@/services/exercise.service";

interface ExercisesState {
  exercises: Exercise[];
  favorites: string[];
  isLoading: boolean;
  error: string | null;
}

type ExercisesAction =
  | { type: 'SET_EXERCISES'; payload: Exercise[] }
  | { type: 'ADD_EXERCISE'; payload: Exercise }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const ExercisesContext = createContext<{
  state: ExercisesState;
  actions: {
    addExercise: (exercise: Exercise) => void;
    toggleFavorite: (id: string) => void;
    loadExercises: () => Promise<void>;
  };
} | null>(null);

function exercisesReducer(state: ExercisesState, action: ExercisesAction): ExercisesState {
  switch (action.type) {
    case 'SET_EXERCISES':
      return { ...state, exercises: action.payload, isLoading: false };
    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.payload] };
    case 'TOGGLE_FAVORITE':
      const favorites = state.favorites.includes(action.payload)
        ? state.favorites.filter(id => id !== action.payload)
        : [...state.favorites, action.payload];
      return { ...state, favorites };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

export const ExercisesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(exercisesReducer, {
    exercises: [],
    favorites: [],
    isLoading: false,
    error: null
  });

  const loadExercises = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const exercises = await exerciseService.getAll();
      dispatch({ type: 'SET_EXERCISES', payload: exercises });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const actions = {
    addExercise: (exercise: Exercise) => 
      dispatch({ type: 'ADD_EXERCISE', payload: exercise }),
    toggleFavorite: (id: string) => 
      dispatch({ type: 'TOGGLE_FAVORITE', payload: id }),
    loadExercises
  };

  return (
    <ExercisesContext.Provider value={{ state, actions }}>
      {children}
    </ExercisesContext.Provider>
  );
};

export const useExercises = () => {
  const context = useContext(ExercisesContext);
  if (!context) throw new Error('useExercises must be used within ExercisesProvider');
  return context;
};
```

### 3.3 Services API avec Auth0

Le template utilise le hook `useSecuredApi()` qui gère automatiquement l'authentification et les permissions.

#### Pattern Hook-Based (Recommandé pour le Template)

```typescript
// apps/client/src/services/exercise.service.ts
// This service layer sits above the hook, providing business logic
import type { Exercise, CreateExerciseDto, AdaptationConstraints } from '@/types/exercise.types';

export const useExerciseService = () => {
  const { getJson, postJson, deleteJson } = useSecuredApi();

  return {
    async getAll(): Promise<Exercise[]> {
      return await getJson(`${import.meta.env.API_BASE_URL}/api/exercises`);
    },

    async getById(id: string): Promise<Exercise> {
      return await getJson(`${import.meta.env.API_BASE_URL}/api/exercises/${id}`);
    },

    async create(dto: CreateExerciseDto): Promise<Exercise> {
      return await postJson(`${import.meta.env.API_BASE_URL}/api/exercises`, dto);
    },

    async analyzeVideo(url: string): Promise<Exercise[]> {
      const response = await postJson(`${import.meta.env.API_BASE_URL}/api/videos/analyze`, { url });
      return response.exercises;
    },

    async adaptExercise(id: string, constraints: AdaptationConstraints): Promise<Exercise> {
      return await postJson(
        `${import.meta.env.API_BASE_URL}/api/exercises/${id}/adapt`,
        constraints
      );
    },

    async delete(id: string): Promise<void> {
      await deleteJson(`${import.meta.env.API_BASE_URL}/api/exercises/${id}`);
    },
  };
};

// apps/client/src/services/match.service.ts
export const useMatchService = () => {
  const { getJson, postJson, deleteJson } = useSecuredApi();

  return {
    async search(filters: MatchFilters): Promise<Match[]> {
      return await getJson(`${import.meta.env.API_BASE_URL}/api/matches`, { params: filters });
    },

    async create(match: CreateMatchDto): Promise<Match> {
      return await postJson(`${import.meta.env.API_BASE_URL}/api/matches`, match);
    },

    async contact(matchId: string, message: string): Promise<void> {
      await postJson(
        `${import.meta.env.API_BASE_URL}/api/matches/${matchId}/contact`,
        { message }
      );
    },

    async delete(id: string): Promise<void> {
      await deleteJson(`${import.meta.env.API_BASE_URL}/api/matches/${id}`);
    },
  };
};

// apps/client/src/services/session.service.ts
export const useSessionService = () => {
  const { getJson, postJson, deleteJson } = useSecuredApi();

  return {
    async getAll(): Promise<TrainingSession[]> {
      return await getJson(`${import.meta.env.API_BASE_URL}/api/sessions`);
    },

    async create(session: CreateSessionDto): Promise<TrainingSession> {
      return await postJson(`${import.meta.env.API_BASE_URL}/api/sessions`, session);
    },

    async adapt(sessionId: string, constraints: SessionConstraints): Promise<TrainingSession> {
      return await postJson(
        `${import.meta.env.API_BASE_URL}/api/sessions/${sessionId}/adapt`,
        constraints
      );
    },

    async delete(id: string): Promise<void> {
      await deleteJson(`${import.meta.env.API_BASE_URL}/api/sessions/${id}`);
    },
  };
};
```

#### Utilisation dans les Composants

```typescript
// apps/client/src/pages/library.tsx
import { useExerciseService } from '@/services/exercise.service';
import { useSecuredApi } from '@/authentication';

export default function LibraryPage() {
  const { t } = useTranslation();
  const { hasPermission } = useSecuredApi();
  const { getAll, create } = useExerciseService();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      if (!hasPermission('exercises:read')) {
        setError(t('error.permission-denied'));
        return;
      }

      setIsLoading(true);
      try {
        const data = await getAll();
        setExercises(data);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  return (
    <DefaultLayout>
      {/* UI pour afficher les exercices */}
    </DefaultLayout>
  );
}
```

#### Méthodes Disponibles du Hook `useSecuredApi()`

```typescript
interface useSecuredApi {
  // Méthodes HTTP avec authentification automatique
  getJson(url: string, options?: RequestInit): Promise<any>;
  postJson(url: string, body: any, options?: RequestInit): Promise<any>;
  putJson(url: string, body: any, options?: RequestInit): Promise<any>;
  deleteJson(url: string, options?: RequestInit): Promise<any>;

  // Gestion des permissions
  hasPermission(permission: string): boolean;
  
  // État d'authentification
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}
```

**Avantages du Pattern Hook-Based :**
- ✅ Gestion automatique du token Auth0
- ✅ Vérification des permissions intégrée
- ✅ Intégration transparente avec React hooks
- ✅ État d'authentification centralisé
- ✅ Compatible avec SSR si besoin
- ✅ Pas de dépendance externe (pas d'axios)

---

## 4. SCHÉMA DE BASE DE DONNÉES D1

```sql
-- apps/cloudflare-worker/migrations/0001_initial.sql
-- Table users (synchronisée avec Auth0)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth0_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  club_id TEXT,
  siret TEXT,
  location TEXT,
  phone TEXT,
  license_id TEXT,
  category TEXT,
  level TEXT,
  stadium_address TEXT,
  latitude REAL,
  longitude REAL,
  subscription TEXT DEFAULT 'Free' CHECK(subscription IN ('Free', 'Pro', 'Ultime')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_users_auth0_sub ON users(auth0_sub);
CREATE INDEX idx_users_email ON users(email);

-- apps/cloudflare-worker/migrations/0002_add_clubs.sql
-- Table clubs (cache API SIRENE)
CREATE TABLE clubs (
  id TEXT PRIMARY KEY,
  siret TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  zip TEXT,
  logo_url TEXT,
  latitude REAL,
  longitude REAL,
  cached_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

CREATE INDEX idx_clubs_siret ON clubs(siret);
CREATE INDEX idx_clubs_city ON clubs(city);

-- apps/cloudflare-worker/migrations/0003_add_exercises.sql
-- Table exercises
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  svg_schema TEXT,
  themes TEXT, -- JSON array: ["TECHNIQUE", "TACTIQUE"]
  nb_joueurs TEXT,
  dimensions TEXT,
  materiel TEXT,
  category TEXT,
  level TEXT,
  duration TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  video_start_seconds INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_level ON exercises(level);
CREATE INDEX idx_exercises_created_at ON exercises(created_at DESC);

-- Table favorites
CREATE TABLE favorites (
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, exercise_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- apps/cloudflare-worker/migrations/0004_add_matches.sql
-- Table matches
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('11v11', '8v8', '5v5', 'Futsal')),
  match_date TEXT NOT NULL, -- ISO 8601
  match_time TEXT NOT NULL, -- HH:MM
  venue TEXT NOT NULL CHECK(venue IN ('Domicile', 'Extérieur', 'Neutre')),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'found', 'expired')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

CREATE INDEX idx_matches_owner_id ON matches(owner_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_date ON matches(match_date);

-- Table match_contacts (clubs intéressés)
CREATE TABLE match_contacts (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT,
  contacted_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- apps/cloudflare-worker/migrations/0005_add_sessions.sql
-- Table training_sessions
CREATE TABLE training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  category TEXT,
  level TEXT,
  total_duration INTEGER,
  constraints TEXT, -- JSON
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'completed')),
  scheduled_date TEXT, -- ISO 8601
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON training_sessions(user_id);
CREATE INDEX idx_sessions_status ON training_sessions(status);

-- Table session_exercises (jonction)
CREATE TABLE session_exercises (
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration INTEGER,
  players INTEGER,
  adapted_data TEXT, -- JSON si exercice adapté
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, exercise_id),
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Table history
CREATE TABLE history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  completed_at INTEGER NOT NULL,
  duration_seconds INTEGER,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_completed_at ON history(completed_at DESC);
```

---

## 5. TYPES TYPESCRIPT

```typescript
// apps/client/src/types/exercise.types.ts
export interface Exercise {
  id: string;
  user_id: string;
  title: string;
  synopsis: string;
  svg_schema: string;
  themes: Theme[];
  nb_joueurs: string;
  dimensions: string;
  materiel: string;
  category: Category;
  level: Level;
  duration: string;
  video_url?: string;
  thumbnail_url?: string;
  video_start_seconds?: number;
  created_at: string;
  updated_at: string;
}

export type Theme = 'TECHNIQUE' | 'PHYSIQUE' | 'TACTIQUE' | 'FINITION' | 'TRANSITION';

export type Category = 
  | 'U7' | 'U9' | 'U11' | 'U13' | 'U15' | 'U17' | 'U19' 
  | 'Séniors' | 'Vétérans';

export type Level = 'Débutant' | 'Ligue' | 'Régional' | 'National' | 'Pro';

export interface CreateExerciseDto {
  title: string;
  synopsis: string;
  svg_schema: string;
  themes: Theme[];
  nb_joueurs: string;
  dimensions: string;
  materiel: string;
  category: Category;
  level: Level;
  duration: string;
  video_url?: string;
}

export interface AdaptationConstraints {
  players: number;
  duration?: number;
  space?: string;
  category?: Category;
  level?: Level;
  equipment?: string[];
}

// apps/client/src/types/match.types.ts
export interface Match {
  id: string;
  owner_id: string;
  club_id: string;
  club: Club;
  category: Category;
  format: Format;
  match_date: string; // ISO 8601
  match_time: string; // HH:MM
  venue: Venue;
  email: string;
  phone: string;
  notes?: string;
  status: MatchStatus;
  contacts: MatchContact[];
  created_at: string;
  updated_at: string;
}

export type Format = '11v11' | '8v8' | '5v5' | 'Futsal';
export type Venue = 'Domicile' | 'Extérieur' | 'Neutre';
export type MatchStatus = 'active' | 'found' | 'expired';

export interface MatchContact {
  user_id: string;
  message: string;
  contacted_at: string;
}

export interface Club {
  id: string;
  siret: string;
  name: string;
  city: string;
  address?: string;
  zip?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
}

// apps/client/src/types/session.types.ts
export interface TrainingSession {
  id: string;
  user_id: string;
  name?: string;
  category?: Category;
  level?: Level;
  total_duration?: number;
  constraints?: SessionConstraints;
  status: SessionStatus;
  scheduled_date?: string;
  exercises: SessionExercise[];
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'draft' | 'scheduled' | 'completed';

export interface SessionExercise {
  exercise_id: string;
  exercise: Exercise;
  order_index: number;
  duration: number;
  players: number;
  adapted_data?: Partial<Exercise>;
}

export interface SessionConstraints {
  players: number;
  duration: number;
  space?: string;
  category?: Category;
  level?: Level;
  equipment?: string[];
}

export interface HistoryEntry {
  id: string;
  user_id: string;
  session_id?: string;
  session?: TrainingSession;
  completed_at: string;
  duration_seconds: number;
  notes?: string;
  created_at: string;
}
```

---

## 6. PLAN DE MIGRATION DÉTAILLÉ

### Phase 1 : Setup Initial (Semaine 1) ✅

```bash
# 1. Cloner le template
git clone https://github.com/sctg-development/vite-react-heroui-auth0-template.git kdufoot
cd kdufoot

# 2. Renommer le projet
# Éditer package.json root, apps/client/package.json, apps/cloudflare-worker/wrangler.jsonc

# 3. Installer Yarn 4
corepack enable
yarn set version 4.12.0

# 4. Installer les dépendances
yarn install

# 5. Configurer Auth0
# Créer application Auth0 "KduFoot"
# Créer API Auth0 "KduFoot API"
# Copier .env.example → .env
# Remplir les variables AUTH0_*

# 6. Configurer Cloudflare
# Créer database D1 : wrangler d1 create kdufoot-db
# Créer buckets R2 : wrangler r2 bucket create kdufoot-videos
# Créer namespace KV : wrangler kv:namespace create cache

# 7. Exécuter migrations D1
wrangler d1 migrations apply kdufoot-db --local

# 8. Tester le setup
yarn dev:env
```

**Checklist :**
- [ ] Template cloné et renommé
- [ ] Auth0 configuré (app + API)
- [ ] Cloudflare configuré (D1, R2, KV)
- [ ] Migrations D1 exécutées
- [ ] Variables d'environnement définies
- [ ] Premier `yarn dev:env` réussi

### Phase 2 : Authentification & Base Users (Semaine 2) ✅

**Objectif :** Adapter le système d'auth pour KduFoot

```bash
# Fichiers à créer/modifier :
apps/client/src/types/user.types.ts
apps/cloudflare-worker/src/routes/auth.ts
apps/client/src/config/site.ts
```

**Checklist :**
- [ ] Adapter les types utilisateur avec champs KduFoot
- [ ] Créer page d'inscription personnalisée
- [ ] Synchronisation Auth0 → D1
- [ ] Écran de profil utilisateur
- [ ] Tests d'authentification

### Phase 3 : Analyse Vidéo & Exercices (Semaine 3-4) 📹

**Checklist :**
- [ ] Service Gemini avec prompts UEFA Pro
- [ ] Upload vidéo vers R2
- [ ] Parsing JSON robuste (5 tiers)
- [ ] Stockage exercices dans D1
- [ ] UI formulaire d'analyse vidéo
- [ ] Cards exercices avec overlay SVG
- [ ] Système de filtres
- [ ] Gestion des favoris
- [ ] Modal de détail exercice

### Phase 4 : Matchs Amicaux (Semaine 5) ⚽

**Checklist :**
- [ ] Intégration API SIRENE
- [ ] Filtrage football uniquement
- [ ] Formulaire création match
- [ ] Lookup SIRET avec debounce
- [ ] Validation club avec logo FFF
- [ ] Recherche matchs par localisation
- [ ] Système de contact
- [ ] Expiration automatique matchs

### Phase 5 : Séances & Chronomètre (Semaine 6-7) 📋

**Checklist :**
- [ ] Session builder (drag & drop)
- [ ] Formulaire d'adaptation granulaire
- [ ] Appel Gemini pour adapter exercices
- [ ] Chronomètre en temps réel
- [ ] Transitions automatiques
- [ ] Sauvegarde historique
- [ ] Export PDF

### Phase 6 : Abonnements & Paiement (Semaine 8) 💳

**Checklist :**
- [ ] Intégration Stripe Checkout
- [ ] Gestion abonnements
- [ ] Webhooks Stripe → D1
- [ ] Page tarifs avec feature flags

### Phase 7 : Optimisations & Finitions (Semaine 9) 🚀

**Checklist :**
- [ ] Optimisation images
- [ ] Code splitting
- [ ] Caching KV
- [ ] Skeleton loaders
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Analytics
- [ ] Tests E2E

### Phase 8 : Déploiement (Semaine 10) 🌍

**Checklist :**
- [ ] Auth0 prod configuré
- [ ] Cloudflare prod créé
- [ ] Worker déployé
- [ ] Client déployé
- [ ] DNS configuré
- [ ] SSL actif

---

## 7. COMMANDES TURBOREPO PERSONNALISÉES

```json
// package.json (root)
{
  "scripts": {
    // Développement
    "dev": "turbo run dev",
    "dev:env": "turbo run dev:env",
    "dev:client": "turbo run dev --filter=client",
    "dev:worker": "turbo run dev --filter=cloudflare-worker",
    
    // Build
    "build": "turbo run build",
    "build:client": "turbo run build --filter=client",
    "build:worker": "turbo run build --filter=cloudflare-worker",
    
    // Qualité
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    
    // Déploiement
    "deploy:worker": "turbo run deploy --filter=cloudflare-worker",
    
    // Migrations D1
    "db:migrate:local": "wrangler d1 migrations apply kdufoot-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply kdufoot-db --remote",
    "db:create-migration": "wrangler d1 migrations create kdufoot-db",
    
    // Utilitaires
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

---

## 8. DIFFÉRENCES CLÉS TEMPLATE VS MAQUETTE ACTUELLE

| Aspect | Maquette Actuelle | Template SCTG | Avantages |
|--------|-------------------|---------------|-----------|
| **Architecture** | Monolithique Flask | Monorepo Turborepo | Caching intelligent, builds parallèles |
| **Frontend** | HTML vanilla (314 Ko) | React 19 + HeroUI | Composants réutilisables, type-safe |
| **CSS** | Bootstrap custom | TailwindCSS 4 + HeroUI | Design system moderne |
| **Auth** | Session Flask filesystem | Auth0 avec JWT | Scalable, sécurisé |
| **Backend** | Python Flask synchrone | Cloudflare Workers | Serverless, edge computing |
| **BDD** | localStorage | D1 (SQLite) | Persistance réelle |
| **Cache** | Aucun | KV (Cloudflare) | Performance++ |
| **Fichiers** | Système local | R2 (S3-compatible) | Illimité, CDN |
| **i18n** | Aucune | i18next (6 langues) | Multilingue |
| **Routing** | Flask routes | React Router v7 | SPA |
| **Coût mensuel** | ~100-500€ (VPS) | ~5-20€ (free tier) | Réduction >90% |

---

## 9. ESTIMATION DES COÛTS (FREE TIER CLOUDFLARE)

### Limites Free Tier

| Service | Limite Gratuite | Usage Estimé KduFoot | Coût |
|---------|----------------|---------------------|------|
| **Workers** | 100K req/jour | ~30K req/jour | 0€ |
| **D1** | 5 GB + 5M lectures/jour | ~500 MB + 50K req/jour | 0€ |
| **R2** | 10 GB + 1M ops | ~5 GB + 10K uploads | 0€ |
| **KV** | 1 GB + 100K lectures/jour | ~50 MB + 20K req/jour | 0€ |

### Coûts Externes

| Service | Usage | Coût |
|---------|-------|------|
| **Auth0** | 7 000 utilisateurs actifs/mois | 0€ |
| **Google Gemini** | ~500 appels/jour | ~10-30€/mois |
| **Stripe** | 2,9% + 0,25€ par transaction | Variable |
| **GitHub Pages** | Hosting frontend | 0€ |

**Total estimé : 10-30€/mois** (vs 100-500€ actuellement) 💰

---

## 10. CHECKLIST FINALE DE MIGRATION

### ✅ Phase 1 : Infrastructure
- [ ] Template cloné et renommé
- [ ] Auth0 configuré
- [ ] Cloudflare configuré
- [ ] Migrations D1 exécutées
- [ ] Variables d'environnement définies

### ✅ Phase 2 : Authentification
- [ ] Types utilisateur adaptés
- [ ] Inscription avec données club
- [ ] Synchronisation Auth0 ↔ D1
- [ ] Page profil

### ✅ Phase 3 : Exercices
- [ ] Service Gemini opérationnel
- [ ] Upload R2 vidéos
- [ ] CRUD exercices D1
- [ ] UI analyse vidéo
- [ ] Favoris

### ✅ Phase 4 : Matchs
- [ ] API SIRENE intégrée
- [ ] Cache clubs D1
- [ ] Formulaire création
- [ ] Recherche localisation

### ✅ Phase 5 : Séances
- [ ] Session builder
- [ ] Adaptation IA
- [ ] Chronomètre
- [ ] Historique

### ✅ Phase 6 : Paiement
- [ ] Stripe Checkout
- [ ] Webhooks
- [ ] Page tarifs

### ✅ Phase 7 : Optimisations
- [ ] Code splitting
- [ ] Caching KV
- [ ] Error handling

### ✅ Phase 8 : Production
- [ ] Worker déployé
- [ ] Client déployé
- [ ] DNS configuré
- [ ] Tests E2E réussis

---

## 11. RESSOURCES & LIENS UTILES

### Documentation Officielle
- [Template SCTG](https://github.com/sctg-development/vite-react-heroui-auth0-template)
- [Turborepo](https://turbo.build/repo/docs)
- [HeroUI v2](https://heroui.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Auth0 React SDK](https://auth0.com/docs/quickstart/spa/react)
- [React Router v7](https://reactrouter.com/)
- [i18next](https://www.i18next.com/)

### APIs Externes
- [API SIRENE](https://recherche-entreprises.api.gouv.fr/)
- [Google Gemini API](https://ai.google.dev/)
- [Stripe Documentation](https://docs.stripe.com/)

---

## 12. CONCLUSION

Ce document fournit un **plan complet et actionnable** pour migrer KduFoot vers une architecture moderne basée sur le template SCTG. L'approche par phases permet de :

1. ✅ **Réduire les coûts** de >90% (100-500€ → 10-30€/mois)
2. ✅ **Améliorer la maintenabilité** (code TypeScript type-safe)
3. ✅ **Scaler facilement** (serverless, edge computing)
4. ✅ **Offrir une meilleure UX** (React 19, HeroUI)
5. ✅ **Garantir la sécurité** (Auth0, JWT, permissions)
6. ✅ **Faciliter l'internationalisation** (i18next avec 6 langues)

**Prochaine étape recommandée :** Commencer par la Phase 1 (Setup Initial).

---

## 13. SYSTÈME DE PERMISSIONS GRANULAIRES KDUFOOT

### 13.1 Architecture des Permissions

KduFoot utilise un système de permissions basé sur Auth0 avec 3 niveaux :
1. **Permissions de base** (héritées du template)
2. **Permissions métier** (spécifiques aux fonctionnalités KduFoot)
3. **Permissions premium** (liées aux abonnements)

### 13.2 Liste Complète des Permissions

#### Permissions de Base (Template)

| Permission | Description | Scope | Free |
|------------|-------------|-------|------|
| `read:api` | Lecture générale des données | Public | ✅ |
| `write:api` | Écriture générale des données | Authentifié | ✅ |

#### Permissions Métier KduFoot

| Permission | Description | Free | Pro | Ultime |
|------------|-------------|------|-----|--------|
| **Exercices** |
| `exercises:read` | Lire ses propres exercices | ✅ | ✅ | ✅ |
| `exercises:read:all` | Lire tous les exercices publics | ❌ | ✅ | ✅ |
| `exercises:create` | Créer des exercices | ✅ | ✅ | ✅ |
| `exercises:update` | Modifier ses exercices | ✅ | ✅ | ✅ |
| `exercises:delete` | Supprimer ses exercices | ✅ | ✅ | ✅ |
| `exercises:share` | Partager publiquement | ❌ | ✅ | ✅ |
| **Analyse Vidéo** |
| `videos:analyze` | Analyser vidéos courtes (< 5 min) | ✅ (3/jour) | ✅ (10/jour) | ✅ |
| `videos:analyze:long` | Analyser vidéos longues (> 5 min) | ❌ | ✅ | ✅ |
| `videos:analyze:batch` | Analyser en batch | ❌ | ❌ | ✅ |
| `videos:priority` | File prioritaire | ❌ | ❌ | ✅ |
| **Séances** |
| `sessions:create` | Créer des séances | ✅ (5 max) | ✅ | ✅ |
| `sessions:adapt` | Adapter avec IA | ✅ (3/mois) | ✅ | ✅ |
| `sessions:template` | Créer des templates | ❌ | ✅ | ✅ |
| `sessions:share` | Partager des séances | ❌ | ✅ | ✅ |
| **Matchs** |
| `matches:create` | Créer annonces | ✅ (2/mois) | ✅ | ✅ |
| `matches:premium` | Annonces mises en avant | ❌ | ✅ | ✅ |
| `matches:contact` | Contacter pour match | ✅ | ✅ | ✅ |
| **Export & Partage** |
| `export:pdf` | Exporter en PDF | ❌ | ✅ | ✅ |
| `export:video` | Export avec vidéos | ❌ | ❌ | ✅ |
| `share:library` | Partager bibliothèque | ❌ | ✅ | ✅ |

#### Permissions Administration

| Permission | Description | Rôle |
|------------|-------------|------|
| `admin:users` | Gérer les utilisateurs | Admin |
| `admin:exercises` | Modérer les exercices | Admin, Moderator |
| `admin:matches` | Modérer les matchs | Admin, Moderator |
| `admin:analytics` | Analytics globales | Admin |
| `admin:billing` | Gérer facturation | Admin |
| `coach:certified` | Badge coach certifié UEFA | Certified Coach |

### 13.3 Configuration Auth0

#### Étape 1 : Créer l'API avec les Permissions

**Dans Auth0 Dashboard → Applications → APIs → "KduFoot API" → Permissions :**

```
# Permissions de base
read:api                    Lecture générale des données
write:api                   Écriture générale des données

# Exercices
exercises:read              Lire ses propres exercices
exercises:read:all          Lire tous les exercices publics
exercises:create            Créer des exercices
exercises:update            Modifier ses exercices
exercises:delete            Supprimer ses exercices
exercises:share             Partager publiquement

# Analyse vidéo
videos:analyze              Analyser vidéos courtes
videos:analyze:long         Analyser vidéos longues
videos:analyze:batch        Analyser en batch
videos:priority             Analyse prioritaire

# Séances
sessions:create             Créer des séances
sessions:adapt              Adapter avec IA
sessions:template           Créer des templates
sessions:share              Partager des séances

# Matchs
matches:create              Créer annonces
matches:premium             Annonces mises en avant
matches:contact             Contacter pour match

# Export & Partage
export:pdf                  Exporter en PDF
export:video                Export avec vidéos
share:library               Partager bibliothèque

# Administration
admin:users                 Gérer utilisateurs
admin:exercises             Modérer exercices
admin:matches               Modérer matchs
admin:analytics             Analytics globales
admin:billing               Gérer facturation
coach:certified             Badge coach certifié
```

#### Étape 2 : Activer RBAC

Dans **API Settings** :
- Activer **Enable RBAC**
- Activer **Add Permissions in the Access Token**

#### Étape 3 : Créer les Rôles

**Auth0 Dashboard → User Management → Roles**

```yaml
# Rôle : Free User (Par défaut)
name: Free User
permissions:
  - read:api
  - write:api
  - exercises:read
  - exercises:create
  - exercises:update
  - exercises:delete
  - videos:analyze              # 3/jour
  - sessions:create             # 5 max
  - sessions:adapt              # 3/mois
  - matches:create              # 2/mois
  - matches:contact

# Rôle : Pro Coach
name: Pro Coach
permissions:
  - (Toutes les permissions Free)
  - exercises:read:all
  - exercises:share
  - videos:analyze:long
  - sessions:template
  - sessions:share
  - matches:premium
  - export:pdf
  - share:library

# Rôle : Ultime Coach
name: Ultime Coach
permissions:
  - (Toutes les permissions Pro)
  - videos:analyze:batch
  - videos:priority
  - export:video
```

#### Étape 4 : Assigner Rôles Automatiquement

**Auth0 Actions → Post User Registration :**

```javascript
exports.onExecutePostUserRegistration = async (event, api) => {
  const ManagementClient = require('auth0').ManagementClient;

  const management = new ManagementClient({
    domain: event.secrets.AUTH0_DOMAIN,
    clientId: event.secrets.AUTH0_CLIENT_ID,
    clientSecret: event.secrets.AUTH0_CLIENT_SECRET,
  });

  const freeUserRoleId = 'rol_XXXXXXXXXX';
  
  try {
    await management.assignRolestoUser(
      { id: event.user.user_id },
      { roles: [freeUserRoleId] }
    );
  } catch (error) {
    console.error('Erreur assignation rôle:', error);
  }
};
```

### 13.4 Implémentation Backend (Cloudflare Worker)

#### Types TypeScript

```typescript
// apps/cloudflare-worker/src/types/permissions.ts

export enum Permission {
  // Base
  READ_API = 'read:api',
  WRITE_API = 'write:api',
  
  // Exercices
  EXERCISES_READ = 'exercises:read',
  EXERCISES_READ_ALL = 'exercises:read:all',
  EXERCISES_CREATE = 'exercises:create',
  EXERCISES_UPDATE = 'exercises:update',
  EXERCISES_DELETE = 'exercises:delete',
  EXERCISES_SHARE = 'exercises:share',
  
  // Vidéos
  VIDEOS_ANALYZE = 'videos:analyze',
  VIDEOS_ANALYZE_LONG = 'videos:analyze:long',
  VIDEOS_ANALYZE_BATCH = 'videos:analyze:batch',
  VIDEOS_PRIORITY = 'videos:priority',
  
  // Séances
  SESSIONS_CREATE = 'sessions:create',
  SESSIONS_ADAPT = 'sessions:adapt',
  SESSIONS_TEMPLATE = 'sessions:template',
  SESSIONS_SHARE = 'sessions:share',
  
  // Matchs
  MATCHES_CREATE = 'matches:create',
  MATCHES_PREMIUM = 'matches:premium',
  MATCHES_CONTACT = 'matches:contact',
  
  // Export
  EXPORT_PDF = 'export:pdf',
  EXPORT_VIDEO = 'export:video',
  SHARE_LIBRARY = 'share:library',
  
  // Admin
  ADMIN_USERS = 'admin:users',
  ADMIN_EXERCISES = 'admin:exercises',
  ADMIN_MATCHES = 'admin:matches',
  ADMIN_ANALYTICS = 'admin:analytics',
  ADMIN_BILLING = 'admin:billing',
  COACH_CERTIFIED = 'coach:certified',
}

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  quota?: QuotaInfo;
}

export interface QuotaInfo {
  current: number;
  limit: number;
  resetAt?: string;
}
```

#### Middleware de Permissions

```typescript
// apps/cloudflare-worker/src/middleware/permissions.middleware.ts

import { checkPermissions } from '../auth0';
import { Permission, PermissionCheck } from '../types/permissions';
import type { Env } from '../types/env';

export async function checkPermission(
  request: Request,
  env: Env,
  permission: Permission
): Promise<PermissionCheck> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { hasPermission: false, reason: 'Token manquant' };
  }

  const token = authHeader.substring(7);
  
  // Vérification Auth0
  const hasPermission = await checkPermissions(token, [permission], env);
  
  if (!hasPermission) {
    return { hasPermission: false, reason: 'Permission refusée' };
  }

  // Vérification quotas
  const quotaCheck = await checkQuota(request, env, permission, token);
  
  return quotaCheck.hasPermission ? { hasPermission: true, quota: quotaCheck.quota } : quotaCheck;
}

async function checkQuota(
  request: Request,
  env: Env,
  permission: Permission,
  token: string
): Promise<PermissionCheck> {
  const quotaConfig: Record<string, { limit: number; period: string }> = {
    [Permission.VIDEOS_ANALYZE]: { limit: 3, period: 'daily' },
    [Permission.VIDEOS_ANALYZE_LONG]: { limit: 10, period: 'daily' },
    [Permission.SESSIONS_ADAPT]: { limit: 3, period: 'monthly' },
    [Permission.MATCHES_CREATE]: { limit: 2, period: 'monthly' },
  };

  const config = quotaConfig[permission];
  if (!config) return { hasPermission: true };

  const userId = extractUserIdFromToken(token);
  const kvKey = `quota:${userId}:${permission}:${getCurrentPeriod(config.period)}`;
  
  const current = parseInt(await env.CACHE.get(kvKey) || '0');
  
  if (current >= config.limit) {
    return {
      hasPermission: false,
      reason: 'Quota atteint',
      quota: { current, limit: config.limit, resetAt: getNextPeriodReset(config.period) }
    };
  }

  await env.CACHE.put(kvKey, String(current + 1), { 
    expirationTtl: getPeriodTTL(config.period) 
  });

  return {
    hasPermission: true,
    quota: { current: current + 1, limit: config.limit }
  };
}

function getCurrentPeriod(period: string): string {
  const now = new Date();
  return period === 'daily' 
    ? now.toISOString().split('T') 
    : now.toISOString().slice(0, 7);
}

function getPeriodTTL(period: string): number {
  return period === 'daily' ? 86400 : 2592000;
}

function getNextPeriodReset(period: string): string {
  const now = new Date();
  if (period === 'daily') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  } else {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }
}

function extractUserIdFromToken(token: string): string {
  const payload = JSON.parse(atob(token.split('.'))); [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154010031/69edb0de-ec16-47f6-8960-1e8bc0f54d30/login_redirect.html)
  return payload.sub;
}
```

#### Utilisation dans les Routes

```typescript
// apps/cloudflare-worker/src/routes/videos.ts

export function setupVideoRoutes(router: Router, env: Env) {
  router.post('/api/videos/analyze', async (request, params) => {
    const permissionCheck = await checkPermission(
      request, 
      env, 
      Permission.VIDEOS_ANALYZE
    );

    if (!permissionCheck.hasPermission) {
      return Response.json(
        { error: permissionCheck.reason, quota: permissionCheck.quota },
        { status: permissionCheck.quota ? 429 : 403 }
      );
    }

    const { url } = await request.json();
    // TODO: Logique d'analyse
    
    return Response.json({ success: true, quota: permissionCheck.quota });
  });
}
```

### 13.5 Implémentation Frontend (React)

#### Hook Personnalisé

```typescript
// apps/client/src/hooks/use-permissions.ts

import { useAuth } from '@/authentication';
import { useState, useEffect } from 'react';

export enum Permission {
  EXERCISES_READ = 'exercises:read',
  VIDEOS_ANALYZE = 'videos:analyze',
  EXPORT_PDF = 'export:pdf',
  // ... autres permissions
}

export function usePermissions() {
  const auth = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (!auth.isAuthenticated) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        const token = await auth.getAccessToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.'))); [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154010031/69edb0de-ec16-47f6-8960-1e8bc0f54d30/login_redirect.html)
          setPermissions(payload.permissions || []);
        }
      } catch (error) {
        console.error('Erreur permissions:', error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, [auth.isAuthenticated]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  return { hasPermission, isLoading, permissions };
}
```

#### Composant PermissionGate

```typescript
// apps/client/src/components/kdufoot/common/permission-gate.tsx

import { usePermissions, Permission } from '@/hooks/use-permissions';
import { Card, CardBody, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface PermissionGateProps {
  permission: Permission;
  showUpgrade?: boolean;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  showUpgrade = true,
  children
}) => {
  const { t } = useTranslation();
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return null;

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (showUpgrade) {
    return (
      <Card className="border-2 border-warning">
        <CardBody className="text-center p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">
            {t('permissions.upgradeRequired')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('permissions.featureRequiresUpgrade')}
          </p>
          <Button as={Link} to="/pricing" color="primary">
            {t('permissions.viewPlans')}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return null;
};
```

#### Utilisation dans les Pages

```typescript
// apps/client/src/pages/library.tsx

import { PermissionGate } from '@/components/kdufoot/common/permission-gate';
import { Permission } from '@/hooks/use-permissions';

export const LibraryPage = () => {
  return (
    <div>
      <h1>Bibliothèque</h1>
      
      {/* Vidéos courtes - Tous */}
      <VideoAnalysisForm type="short" />
      
      {/* Vidéos longues - Pro/Ultime */}
      <PermissionGate permission={Permission.VIDEOS_ANALYZE_LONG}>
        <VideoAnalysisForm type="long" />
      </PermissionGate>
      
      {/* Export PDF - Pro/Ultime */}
      <PermissionGate permission={Permission.EXPORT_PDF}>
        <Button onClick={handleExportPDF}>
          {t('exercise.exportPDF')}
        </Button>
      </PermissionGate>
    </div>
  );
};
```

#### Badge Coach Certifié

```typescript
// apps/client/src/components/kdufoot/common/certified-badge.tsx

import { usePermissions, Permission } from '@/hooks/use-permissions';
import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export const CertifiedBadge = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  if (!hasPermission(Permission.COACH_CERTIFIED)) {
    return null;
  }

  return (
    <Chip color="success" variant="flat" className="ml-2">
      {t('badges.certifiedCoach')}
    </Chip>
  );
};
```

### 13.6 Matrice de Permissions par Abonnement

```typescript
// apps/client/src/config/permissions-matrix.ts

export type Subscription = 'Free' | 'Pro' | 'Ultime';

export const PERMISSIONS_MATRIX: Record<Subscription, Permission[]> = {
  Free: [
    Permission.READ_API,
    Permission.WRITE_API,
    Permission.EXERCISES_READ,
    Permission.EXERCISES_CREATE,
    Permission.VIDEOS_ANALYZE, // 3/jour
    Permission.SESSIONS_CREATE, // 5 max
    Permission.MATCHES_CREATE, // 2/mois
    Permission.MATCHES_CONTACT,
  ],
  
  Pro: [
    // Toutes les permissions Free +
    Permission.EXERCISES_READ_ALL,
    Permission.EXERCISES_SHARE,
    Permission.VIDEOS_ANALYZE_LONG,
    Permission.SESSIONS_TEMPLATE,
    Permission.SESSIONS_SHARE,
    Permission.MATCHES_PREMIUM,
    Permission.EXPORT_PDF,
    Permission.SHARE_LIBRARY,
  ],
  
  Ultime: [
    // Toutes les permissions Pro +
    Permission.VIDEOS_ANALYZE_BATCH,
    Permission.VIDEOS_PRIORITY,
    Permission.EXPORT_VIDEO,
  ],
};
```

---

## 14. SYSTÈME D'INTERNATIONALISATION (i18n)

### 14.1 Architecture i18n du Template

Le template utilise **i18next** avec **i18next-http-backend** et **react-i18next**.

**Caractéristiques :**
- ✅ **6 langues pré-configurées** (Anglais, Français, Espagnol, Chinois, Arabe, Hébreu)
- ✅ **Support RTL** automatique
- ✅ **Persistance** dans `localStorage`
- ✅ **Système de namespaces**
- ✅ **HTML sécurisé** dans les traductions
- ✅ **Interpolation** de variables

### 14.2 Configuration de Base

```typescript
// apps/client/src/i18n.ts (déjà présent)

export interface AvailableLanguage {
  code: string;           // ISO 639-1
  nativeName: string;     // Nom natif
  isRTL: boolean;         // Support RTL
  isDefault?: boolean;    // Langue par défaut
}

export const availableLanguages: AvailableLanguage[] = [
  { code: "en-US", nativeName: "English", isRTL: false, isDefault: true },
  { code: "fr-FR", nativeName: "Français", isRTL: false },
  { code: "es-ES", nativeName: "Español", isRTL: false },
  { code: "zh-CN", nativeName: "中文", isRTL: false },
  { code: "ar-SA", nativeName: "العربية", isRTL: true },
  { code: "he-IL", nativeName: "עברית", isRTL: true },
];
```

### 14.3 Structure des Fichiers

```
apps/client/src/locales/
├── base/                   # Namespace "base" (template)
│   ├── en-US.json
│   ├── fr-FR.json
│   └── ...
│
└── kdufoot/                # NOUVEAU : Namespace "kdufoot"
    ├── en-US.json
    ├── fr-FR.json
    └── ...
```

### 14.4 Exemple de Traductions KduFoot

```json
// apps/client/src/locales/kdufoot/fr-FR.json
{
  "video": {
    "title": "Analyseur de Vidéo",
    "urlPlaceholder": "Lien YouTube, TikTok, Instagram...",
    "analyze": "ANALYSER",
    "analyzing": "Analyse en cours...",
    "progress": "Progression : {{percent}}%",
    "success": "{{count}} exercices détectés !",
    "error": "Erreur : {{message}}"
  },
  
  "exercise": {
    "title": "Exercice",
    "favorite": "Favoris",
    "unfavorite": "Retirer des favoris",
    "addToSession": "Ajouter à la séance",
    "adapt": "Adapter",
    "exportPDF": "Exporter en PDF",
    "themes_list": {
      "TECHNIQUE": "Technique",
      "PHYSIQUE": "Physique",
      "TACTIQUE": "Tactique",
      "FINITION": "Finition",
      "TRANSITION": "Transition"
    },
    "categories": {
      "U7": "U7 (moins de 7 ans)",
      "U9": "U9 (moins de 9 ans)",
      "U13": "U13 (moins de 13 ans)",
      "Séniors": "Séniors"
    }
  },
  
  "match": {
    "title": "Trouver mon Match",
    "create": "Créer une annonce",
    "siretLabel": "SIRET du club",
    "formats": {
      "11v11": "11 contre 11",
      "8v8": "8 contre 8",
      "Futsal": "Futsal"
    }
  },
  
  "session": {
    "title": "Mon Entraînement",
    "create": "Créer une séance",
    "start": "Démarrer",
    "constraints": {
      "players": "Nombre de joueurs",
      "duration": "Durée (minutes)"
    }
  },
  
  "permissions": {
    "upgradeRequired": "Mise à niveau requise",
    "featureRequiresUpgrade": "Abonnement Pro/Ultime requis",
    "viewPlans": "Voir les plans"
  },
  
  "quota": {
    "remaining": "{{current}}/{{limit}} utilisations",
    "exceeded": "Quota dépassé"
  },
  
  "errors": {
    "quotaReached": "Quota atteint ({{current}}/{{limit}})",
    "invalidVideo": "URL invalide"
  }
}
```

### 14.5 Ajouter le Namespace "kdufoot"

```typescript
// apps/client/src/i18n.ts

i18n
  .use(i18nextHttpBackend)
  .use(initReactI18next)
  .init<HttpBackendOptions>({
    // ... config existante
    
    // MODIFICATION : Ajouter le namespace
    ns: ["base", "kdufoot"],  // ⬅️
    defaultNS: "kdufoot",      // ⬅️
    
    backend: {
      loadPath: (lng, ns) => {
        let url: URL = new URL("./locales/base/en-US.json", import.meta.url);

        switch (ns) {
          case "base":
            // ... code existant
            break;
            
          case "kdufoot":  // ⬅️ NOUVEAU
            switch (lng) {
              case "en-US":
                url = new URL("./locales/kdufoot/en-US.json", import.meta.url);
                break;
              case "fr-FR":
                url = new URL("./locales/kdufoot/fr-FR.json", import.meta.url);
                break;
              // ... autres langues
            }
            break;
        }

        return url.toString();
      },
    },
  });
```

### 14.6 Utilisation dans React

#### Utilisation Simple

```typescript
import { useTranslation } from 'react-i18next';

export const LibraryPage = () => {
  const { t } = useTranslation(); // Utilise "kdufoot" par défaut

  return (
    <div>
      <h1>{t('library.title')}</h1>
      <p>{t('library.noExercises')}</p>
    </div>
  );
};
```

#### Interpolation

```typescript
const { t } = useTranslation();

<p>{t('video.progress', { percent: 75 })}</p>
// Résultat : "Progression : 75%"

<p>{t('video.success', { count: 5 })}</p>
// Résultat : "5 exercices détectés !"
```

#### Traductions d'Enums

```typescript
export const ExerciseCard = ({ exercise }) => {
  const { t } = useTranslation();

  return (
    <div>
      <span>{t(`exercise.themes_list.${exercise.theme}`)}</span>
      {/* Si theme = "TECHNIQUE" → "Technique" */}
      
      <span>{t(`exercise.categories.${exercise.category}`)}</span>
      {/* Si category = "U13" → "U13 (moins de 13 ans)" */}
    </div>
  );
};
```

#### Hook Personnalisé pour Enums

```typescript
// apps/client/src/hooks/use-translated-enum.ts

import { useTranslation } from 'react-i18next';

export function useTranslatedThemes() {
  const { t } = useTranslation();
  
  const themes = ['TECHNIQUE', 'PHYSIQUE', 'TACTIQUE', 'FINITION', 'TRANSITION'];
  
  return themes.map(theme => ({
    value: theme,
    label: t(`exercise.themes_list.${theme}`)
  }));
}

// Utilisation
export const ExerciseFilters = () => {
  const themes = useTranslatedThemes();

  return (
    <Select label="Thème">
      {themes.map(theme => (
        <SelectItem key={theme.value} value={theme.value}>
          {theme.label}
        </SelectItem>
      ))}
    </Select>
  );
};
```

### 14.7 Support RTL

Le template gère automatiquement les langues RTL :

```typescript
// apps/client/src/components/language-switch.tsx (déjà présent)

useEffect(() => {
  const isRTL = availableLanguages.find((lang) => lang.code === language)?.isRTL || false;
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
}, [language]);
```

**CSS adaptatif :**

```css
/* Marges adaptatives */
<div className="mr-4 rtl:mr-0 rtl:ml-4">
  Contenu
</div>
```

### 14.8 Composant LanguageSwitch

Le template fournit déjà un composant complet :

```typescript
// apps/client/src/components/navbar.tsx

import { LanguageSwitch } from '@/components/language-switch';
import { availableLanguages } from '@/i18n';

export const Navbar = () => {
  return (
    <nav>
      <LanguageSwitch availableLanguages={availableLanguages} />
    </nav>
  );
};
```

### 14.9 Bonnes Pratiques

#### ✅ Organisation des Clés

```json
{
  "section": {
    "subsection": {
      "key": "Valeur"
    }
  }
}
```

#### ✅ Nommage Cohérent

- **Sections** : `video`, `exercise`, `match`, `session`
- **Actions** : `create`, `edit`, `delete`, `save`
- **Messages** : `success`, `error`, `warning`

#### ✅ Éviter la Duplication

**❌ Mauvais :**
```json
{
  "exercise.save": "Enregistrer",
  "match.save": "Enregistrer"
}
```

**✅ Bon :**
```json
{
  "common.save": "Enregistrer"
}
```

### 14.10 Checklist i18n

#### ✅ Configuration
- [ ] Créer `locales/kdufoot/` pour les 6 langues
- [ ] Modifier `i18n.ts` pour ajouter namespace
- [ ] Tester chargement

#### ✅ Traductions
- [ ] Traduire toutes les sections
- [ ] Ajouter enums traduits
- [ ] Ajouter messages erreur/succès
- [ ] Traduire permissions et quotas

#### ✅ Tests
- [ ] Tester changement de langue
- [ ] Tester interpolation
- [ ] Tester support RTL
- [ ] Vérifier persistance localStorage

---

## 15. STANDARDS DE CODAGE & BONNES PRATIQUES 🔧
> **Important :** l'équipe est francophone, mais **tout le code, les identifiants, les commentaires (JSDoc/TSDoc), les annotations OpenAPI et les messages de commit doivent être rédigés en anglais**. Cela facilite la revue de code, l'intégration d'outils externes et la collaboration open source.

### 15.1 Langue et style 🗣️
- **Langue :** Anglais (US) pour les identifiants, les commentaires et les messages de commit.
- **Clarté :** Rédigez des commentaires concis et utiles ; évitez d'expliquer ce que le code exprime déjà.
- **Tonalité :** Utilisez un style neutre et professionnel (impératif pour les TODOs, descriptif pour la documentation).

### 15.2 Conventions de nommage ✅
- **Fichiers & dossiers :** kebab-case (ex. `exercise-card.tsx`, `use-exercises.ts`).
  - Exceptions : fichiers de configuration (`tsconfig.json`, `vite.config.ts`), migrations (`0001_initial.sql`).
- **Composants React & Types/Interfaces :** PascalCase (ex. `ExerciseCard`, `TrainingSession`).
- **Hooks & services :** `use-xxx.ts` ou `xxx.service.ts` en kebab-case (ex. `use-exercises.ts`, `exercise.service.ts`).
- **Fonctions & variables :** camelCase (ex. `getExercises`, `isLoading`).
- **Constantes :** SCREAMING_SNAKE pour les variables d'environnement, sinon camelCase pour les constantes locales.
- **Enums :** Nom en PascalCase, valeurs en UPPER_SNAKE ou PascalCase selon l'usage ; privilégier des chaînes sémantiques (voir l'enum Permissions).

### 15.3 Qualité & linters 🧹
- **ESLint + Prettier** appliqués (utiliser les configurations du projet). Corrigez les problèmes de lint avant d'ouvrir une PR.
- **TypeScript strict :** conservez `strict: true`, évitez `any`. Privilégiez les types de retour explicites pour les fonctions exportées.
- **Préférer `const`** et `readonly` lorsque possible ; n'utilisez `let` que pour des réaffectations.
- **Gestion des erreurs :** gérez systématiquement les erreurs (try/catch), renvoyez des structures d'erreur claires et typées.
- **Logging :** évitez `console.log` en production ; utilisez une abstraction de logger et supprimez les logs de debug avant la PR.
- **Accessibilité :** respectez les bonnes pratiques a11y pour les composants interactifs (ARIA, navigation au clavier).

### 15.4 Tests & CI ✅
- **Tests :** tests unitaires pour les services/hooks et les routes du worker (Vitest). Ajoutez des tests pour les cas limites et la gestion des permissions.
- **E2E :** ajoutez des tests d'intégration au fur et à mesure que les fonctionnalités se stabilisent.
- **Couverture :** les nouvelles fonctionnalités doivent être couvertes ; le job CI doit exécuter les tests et la vérification des types.

### 15.5 JSDoc / TSDoc (ENGLISH) 📝
- Utilisez **l'anglais** pour tous les commentaires de documentation. Privilégiez le style TSDoc/JSDoc avec `@param`, `@returns`, `@throws`, `@example`.
- Gardez les exemples minimaux et directement copiables.

Example (TypeScript/JSDoc):

```ts
/**
 * Adapt an exercise according to the provided constraints.
 *
 * @remarks
 * Calls the backend `/api/exercises/:id/adapt` endpoint and returns the adapted exercise.
 *
 * @param {string} id - Exercise identifier
 * @param {AdaptationConstraints} constraints - Constraints used for adaptation
 * @returns {Promise<Exercise>} Adapted exercise
 *
 * @example
 * const adapted = await adaptExercise('ex_123', { players: 8, duration: 12 });
 */
export async function adaptExercise(id: string, constraints: AdaptationConstraints): Promise<Exercise> {
  // implementation
}
```

### 15.6 Annotations OpenAPI (swagger-jsdoc) 📚
- Ajoutez des commentaires JSDoc OpenAPI au-dessus des handlers de route dans les **Cloudflare Worker routes**. La documentation doit être rédigée en anglais.
- Utilisez `swagger-jsdoc` ou un équivalent pour générer `openapi.json` dans le CI ou via un script.

Example JSDoc for an API route:

```ts
/**
 * @openapi
 * /api/videos/analyze:
 *   post:
 *     summary: Analyze a short video and return detected exercises
 *     tags:
 *       - Videos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://www.youtube.com/watch?v=...
 *     responses:
 *       '200':
 *         description: Analysis result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exercises:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Exercise'
 */
router.post('/api/videos/analyze', async (request) => { /* handler */ });
```

Components / Schemas example (centralized):

```ts
/**
 * @openapi
 * components:
 *   schemas:
 *     Exercise:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         synopsis:
 *           type: string
 *       required: [id, title]
 */
```

- **Recommandation :** Ajoutez un script npm `openapi:generate` qui exécute `swagger-jsdoc` et écrit `openapi.json` dans `apps/cloudflare-worker/openapi.json`, puis intégrez-le aux vérifications CI.

### 15.7 Pull Requests & commits ✅
- **Commits :** format Conventional Commits (ex. `feat(video): analyze endpoint`, `fix(exercise): handle missing svg`). Messages en **anglais**.
- **Description PR :** expliquez pourquoi, pas seulement ce qui a été fait. Liez l'issue, listez les choix de conception importants et joignez captures d'écran ou exemples curl pour les changements API.
- **Checklist de review :** lint, type-check, tests, build, mises à jour de la doc (OpenAPI, clés i18n).

### 15.8 Sécurité & secrets 🔒
- Ne commitez jamais de secrets. Utilisez `.env` pour le développement local et gérez les secrets de production via Cloudflare / Terraform.
- Validez et assainissez les entrées côté serveur (uploads R2, prompts Gemini).
- Appliquez du rate-limiting sur les endpoints sensibles et protégez-les via permissions/quotas.

### 15.9 Internationalisation (i18n) 🎯
- Toutes les chaînes visibles doivent provenir des clés de traduction (`kdufoot` namespace). Les clés et les commentaires dans le code doivent être en anglais.
- Évitez les chaînes codées en dur dans les composants.

### 15.10 Checklist PR rapide ✅
- [ ] Code en anglais (identifiants + commentaires)
- [ ] JSDoc/TSDoc présent pour les fonctions exportées et la logique importante
- [ ] Annotations OpenAPI pertinentes ajoutées/mises à jour pour les changements d'API
- [ ] Tests unitaires ajoutés/mis à jour, CI vert
- [ ] Clés i18n ajoutées pour les nouveaux textes visibles
- [ ] Lint & format OK, vérification des types passée
- [ ] i18n keys added for new visible texts
- [ ] Lint & format OK, type-check passes

---

## 16. RESPECT DES LICENCES & COPYRIGHT 🔏
> **Rappel :** le template et certains fichiers sources sont soumis à des licences (ex. **AGPL-3.0-or-later**). Le respect des mentions de licence et des en-têtes copyright est obligatoire.

- **Vérifier la licence principale :** consultez le fichier `LICENSE` à la racine et respectez la licence indiquée (AGPL-3.0-or-later) ainsi que les licences des dépendances.
- **Conserver les en-têtes existants :** pour tout fichier provenant du template ou inspiré du template, **ne retirez pas** l'en-tête de copyright ni la mention de licence d'origine.
- **Fichiers modifiés :** conservez l'en-tête original et, si nécessaire, ajoutez une ligne indiquant la modification (en anglais). Exemple :

```ts
/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * Modified by: <Name> (2026)
 * License: AGPL-3.0-or-later
 */
```

- **Nouveaux fichiers :** si le fichier n'hérite pas d'un header existant, ajoutez un header minimal (en anglais) :

```ts
/**
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */
```

- **Code tiers :** quand vous réutilisez du code tiers (snippets, bibliothèques), conservez les mentions de licence attachées à ce code et ajoutez une note d'attribution dans le fichier ou dans la PR.

- **Contrôles & automations recommandés :**
  - Ajoutez un job CI `license:check` (ex. `license-checker`, `reuse`, ou équivalent) pour détecter les dépendances et incompatibilités de licence.
  - Ajoutez un hook pre-commit pour vérifier la présence d'un header de licence sur les fichiers sources modifiés.
  - Dans les PRs qui ajoutent du code tiers ou modifient des licences, documentez explicitement l'origine et la licence du code ajouté.

- **Non-respect :** la suppression ou l'altération des mentions de licence peut entraîner des risques juridiques ; contactez immédiatement l'auteur du template avant de proposer un changement de licence.

---

**Document généré le :** 08 février 2026  
**Auteur :** Ronan Le Meillat  
**Version :** 2.0 (Complète avec Permissions + i18n + Coding standards)  
