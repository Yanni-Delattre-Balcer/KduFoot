# ANALYSE TECHNIQUE - KDUFOOT
## Reverse Engineering & Plan de Migration vers Template SCTG Development de Ronan Le Meillat

**Version:** 2.2
**Auteur:** Ronan Le Meillat
**Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)  
**Date:** 08 février 2026  
**Template de base:** [vite-react-heroui-auth0-template](https://github.com/sctg-development/vite-react-heroui-auth0-template)  
**Référence:** [feedback-flow](https://github.com/sctg-development/feedback-flow) pour la gestion Auth0  
**Objectif:** Migration complète vers architecture moderne Turborepo/Cloudflare Workers/React/Auth0

---

## Table des Matières

1. [Présentation Générale du Projet](#1-présentation-générale-du-projet)
2. [Mapping des Fonctionnalités vers la Nouvelle Architecture](#2-mapping-des-fonctionnalités-vers-la-nouvelle-architecture)
  2.1. [Politique de versioning de l'API](#211-politique-de-versioning-de-lapi)
3. [Structure des Composants React](#3-structure-des-composants-react)
4. [Schéma de Base de Données D1](#4-schéma-de-base-de-données-d1)
5. [Types TypeScript](#5-types-typescript)
6. [Plan de Migration Détaillé](#6-plan-de-migration-détaillé)
7. [Commandes Turborepo Personnalisées](#7-commandes-turborepo-personnalisées)
8. [Différences Clés Template vs Maquette Actuelle](#8-différences-clés-template-vs-maquette-actuelle)
9. [Estimation des Coûts](#9-estimation-des-coûts)
10. [Checklist Finale de Migration](#10-checklist-finale-de-migration)
11. [Ressources & Liens Utiles](#11-ressources--liens-utiles)
12. [Conclusion](#12-conclusion)
13. [Système de Permissions Granulaires KduFoot](#13-système-de-permissions-granulaires-kdufoot)
14. [Système d'Internationalisation (i18n)](#14-système-dinternationalisation-i18n)
15. [Gestion Graphique des Permissions Auth0](#15-gestion-graphique-des-permissions-auth0)
16. [Standards de Codage & Bonnes Pratiques](#16-standards-de-codage--bonnes-pratiques)
17. [Respect des Licences & Copyright](#17-respect-des-licences--copyright)
18. [Plan d'Actions Détaillé pour IA de Codage](#18-plan-dactions-détaillé-pour-ia-de-codage)
19. [Conclusion](#19-conclusion)

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
│   │   │   │   ├── admin/
│   │   │   │   │   ├── users-permissions-table.tsx
│   │   │   │   │   ├── permission-checkbox.tsx
│   │   │   │   │   └── user-modal.tsx
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
│   │   │   │   ├── admin-users.tsx         # NEW: Gestion permissions
│   │   │   │   └── 404.tsx
│   │   │   │
│   │   │   ├── services/                  # Services API
│   │   │   │   ├── api.ts
│   │   │   │   ├── video.service.ts
│   │   │   │   ├── exercise.service.ts
│   │   │   │   ├── match.service.ts
│   │   │   │   ├── session.service.ts
│   │   │   │   ├── auth0.service.ts        # NEW: Auth0 Management API
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
│   │   │   │   ├── auth0.types.ts          # NEW: Auth0 types
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
│       │   │   ├── payments.ts
│       │   │   └── system/                 # NEW: System routes
│       │   │       └── index.ts            # Auth0 token endpoint
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
| `/api/register` | `/api/v1/auth/register` | `routes/auth.ts` | POST | - |
| `/api/login` | `/api/v1/auth/login` | `routes/auth.ts` | POST | - |
| `/api/auth/me` | `/api/v1/auth/me` | `routes/auth.ts` | GET | `read:api` |
| `/add_video` | `/api/v1/videos/analyze` | `routes/videos.ts` | POST | `videos:analyze` |
| `/adapt_session_granular` | `/api/v1/sessions/adapt` | `routes/sessions.ts` | POST | `sessions:adapt` |
| `/api/v2/siret-lookup` | `/api/v1/clubs/lookup` | `routes/siret.ts` | GET | - |
| `/api/clubs/search` | `/api/v1/clubs/search` | `routes/siret.ts` | GET | - |
| `/create-checkout-session` | `/api/v1/payments/checkout` | `routes/payments.ts` | POST | `read:api` |
| **NEW** | `/api/v1/__auth0/token` | `routes/system/index.ts` | POST | `admin:auth0` |

#### Exemple d'implémentation : `routes/videos.ts`

```typescript
// apps/cloudflare-worker/src/routes/videos.ts
import { Router } from './router';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import type { Env } from '../types/env';

export function setupVideoRoutes(router: Router, env: Env) {
  // POST /api/v1/videos/analyze - Analyse vidéo courte
  router.post('/api/v1/videos/analyze', async (request, params) => {
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

  // POST /api/v1/videos/analyze/long - Analyse vidéo longue (>5min)
  router.post('/api/v1/videos/analyze/long', async (request, params) => {
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

---

### 2.1.1 Politique de versioning de l'API

Toutes les routes publiques exposées par les Cloudflare Workers doivent être préfixées par `/api/v1/` pour la première version stable. Pour tout changement compatible, ajouter uniquement de nouvelles routes ; pour tout changement incompatible (breaking change), augmenter la version majeure (ex. `/api/v2/`) et documenter la migration dans le changelog.

Bonnes pratiques recommandées :
- Documenter les changements breaking et planifier une période de dépréciation avant suppression.
- Faire pointer `API_BASE_URL` côté client vers l'URL incluant la version (ex. `http://localhost:8787/api/v1`).
- Évaluer des redirections ou des wrappers pour assurer une transition douce lorsque nécessaire.

---
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

# Auth0 Management API (for admin permissions management)
AUTH0_MANAGEMENT_API_CLIENT_ID=your-management-api-client-id
AUTH0_MANAGEMENT_API_CLIENT_SECRET=your-management-api-client-secret
ADMIN_AUTH0_PERMISSION=admin:auth0

# API
API_BASE_URL=http://localhost:8787/api/v1
CORS_ORIGIN=http://localhost:5173

# Permissions
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api

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
    "CORS_ORIGIN": "http://localhost:5173",
    "AUTH0_DOMAIN": "kdufoot.eu.auth0.com",
    "AUTH0_AUDIENCE": "https://api.kdufoot.com",
    "ADMIN_AUTH0_PERMISSION": "admin:auth0"
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
      "binding": "KV_CACHE",
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
import { useExerciseService } from "@/services/exercise.service";

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

  const { getAll } = useExerciseService();

  const loadExercises = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const exercises = await getAll();
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

**Le template utilise le hook `useSecuredApi` qui gère automatiquement l'authentification et les permissions**

#### Pattern Hook-Based Recommandé pour le Template

```typescript
// apps/client/src/services/exercise.service.ts
// This service layer sits above the hook, providing business logic
import type { Exercise, CreateExerciseDto, AdaptationConstraints } from "@/types/exercise.types";

export const useExerciseService = () => {
  const { getJson, postJson, deleteJson } = useSecuredApi();

  return {
    async getAll(): Promise<Exercise[]> {
      return await getJson(`${import.meta.env.API_BASE_URL}/exercises`);
    },

    async getById(id: string): Promise<Exercise> {
      return await getJson(`${import.meta.env.API_BASE_URL}/exercises/${id}`);
    },

    async create(dto: CreateExerciseDto): Promise<Exercise> {
      return await postJson(`${import.meta.env.API_BASE_URL}/exercises`, dto);
    },

    async analyzeVideo(url: string): Promise<Exercise[]> {
      const response = await postJson(`${import.meta.env.API_BASE_URL}/videos/analyze`, { url });
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
    }
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
    }
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
    }
  };
};
```

#### Utilisation dans les Composants

```typescript
// apps/client/src/pages/library.tsx
import { useExerciseService } from "@/services/exercise.service";
import { useSecuredApi } from "@/authentication";

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

#### Méthodes Disponibles du Hook `useSecuredApi`

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
export type Category = 'U7' | 'U9' | 'U11' | 'U13' | 'U15' | 'U17' | 'U19' | 'Séniors' | 'Vétérans';
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
  equipment?: string;
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
  equipment?: string;
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

### Phase 1: Setup Initial (Semaine 1)

**Objectif:** Préparer l'environnement de développement

```bash
# 1. Cloner le template
git clone https://github.com/sctg-development/vite-react-heroui-auth0-template.git kdufoot
cd kdufoot

# 2. Renommer le projet
# Éditer package.json (root), apps/client/package.json, apps/cloudflare-worker/wrangler.jsonc

# 3. Installer Yarn 4
corepack enable
yarn set version 4.12.0

# 4. Installer les dépendances
yarn install

# 5. Configurer Auth0
# - Créer application Auth0 "KduFoot"
# - Créer API Auth0 "KduFoot API"
# - Copier .env.example → .env
# - Remplir les variables AUTH0_*

# 6. Configurer Cloudflare
# - Créer database D1
wrangler d1 create kdufoot-db

# - Créer buckets R2
wrangler r2 bucket create kdufoot-videos

# - Créer namespace KV
wrangler kv:namespace create cache

# 7. Exécuter migrations D1
wrangler d1 migrations apply kdufoot-db --local

# 8. Tester le setup
yarn dev:env
```

**Checklist:**
- ✅ Template cloné et renommé
- ✅ Auth0 configuré (app + API)
- ✅ Cloudflare configuré (D1, R2, KV)
- ✅ Migrations D1 exécutées
- ✅ Variables d'environnement définies
- ✅ Premier `yarn dev:env` réussi

### Phase 2: Authentification & Base Users (Semaine 2)

**Objectif:** Adapter le système d'auth pour KduFoot

```bash
# Fichiers à créer/modifier:
# - apps/client/src/types/user.types.ts
# - apps/cloudflare-worker/src/routes/auth.ts
# - apps/client/src/config/site.ts
```

**Checklist:**
- ✅ Adapter les types utilisateur avec champs KduFoot
- ✅ Créer page d'inscription personnalisée
- ✅ Synchronisation Auth0 → D1
- ✅ Écran de profil utilisateur
- ✅ Tests d'authentification

### Phase 3: Analyse Vidéo & Exercices (Semaine 3-4)

**Checklist:**
- ✅ Service Gemini avec prompts UEFA Pro
- ✅ Upload vidéo vers R2
- ✅ Parsing JSON robuste (5 tiers)
- ✅ Stockage exercices dans D1
- ✅ UI formulaire d'analyse vidéo
- ✅ Cards exercices avec overlay SVG
- ✅ Système de filtres
- ✅ Gestion des favoris
- ✅ Modal de détail exercice

### Phase 4: Matchs Amicaux (Semaine 5)

**Checklist:**
- ✅ Intégration API SIRENE
- ✅ Filtrage football uniquement
- ✅ Formulaire création match
- ✅ Lookup SIRET avec debounce
- ✅ Validation club avec logo FFF
- ✅ Recherche matchs par localisation
- ✅ Système de contact
- ✅ Expiration automatique matchs

### Phase 5: Séances & Chronomètre (Semaine 6-7)

**Checklist:**
- ✅ Session builder (drag & drop)
- ✅ Formulaire d'adaptation granulaire
- ✅ Appel Gemini pour adapter exercices
- ✅ Chronomètre en temps réel
- ✅ Transitions automatiques
- ✅ Sauvegarde historique
- ✅ Export PDF

### Phase 6: Abonnements & Paiement (Semaine 8)

**Checklist:**
- ✅ Intégration Stripe Checkout
- ✅ Gestion abonnements
- ✅ Webhooks Stripe → D1
- ✅ Page tarifs avec feature flags

### Phase 7: Optimisations & Finitions (Semaine 9)

**Checklist:**
- ✅ Optimisation images
- ✅ Code splitting
- ✅ Caching KV
- ✅ Skeleton loaders
- ✅ Error boundaries
- ✅ Toast notifications
- ✅ Analytics
- ✅ Tests E2E

### Phase 8: Déploiement (Semaine 10)

**Checklist:**
- ✅ Auth0 prod configuré
- ✅ Cloudflare prod créé
- ✅ Worker déployé
- ✅ Client déployé
- ✅ DNS configuré
- ✅ SSL actif

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
| **Auth** | Session Flask (filesystem) | Auth0 avec JWT | Scalable, sécurisé |
| **Backend** | Python Flask (synchrone) | Cloudflare Workers | Serverless, edge computing |
| **BDD** | localStorage | D1 (SQLite) | Persistance réelle |
| **Cache** | Aucun | KV Cloudflare | Performance |
| **Fichiers** | Système local | R2 (S3-compatible) | Illimité, CDN |
| **i18n** | Aucune | i18next (6 langues) | Multilingue |
| **Routing** | Flask routes | React Router v7 | SPA |
| **Coût mensuel** | 100-500€ (VPS) | 5-20€ (free tier) | Réduction 90% |

---

## 9. ESTIMATION DES COÛTS

### Limites Free Tier

| Service | Limite Gratuite | Usage Estimé KduFoot | Coût |
|---------|----------------|---------------------|------|
| **Workers** | 100K req/jour | 30K req/jour | 0€ |
| **D1** | 5 GB + 5M lectures/jour | 500 MB + 50K req/jour | 0€ |
| **R2** | 10 GB + 1M ops | 5 GB + 10K uploads | 0€ |
| **KV** | 1 GB + 100K lectures/jour | 50 MB + 20K req/jour | 0€ |

**Total estimé:** 10-30€/mois vs 100-500€ actuellement

### Coûts Externes

| Service | Usage | Coût |
|---------|-------|------|
| **Auth0** | 7 000 utilisateurs actifs/mois | 0€ |
| **Google Gemini** | 500 appels/jour | 10-30€/mois |
| **Stripe** | 2,9% + 0,25€ par transaction | Variable |
| **GitHub Pages** | Hosting frontend | 0€ |

**Total estimé:** 10-30€/mois vs 100-500€ actuellement

---

## 10. CHECKLIST FINALE DE MIGRATION

### Phase 1: Infrastructure
- ✅ Template cloné et renommé
- ✅ Auth0 configuré
- ✅ Cloudflare configuré
- ✅ Migrations D1 exécutées
- ✅ Variables d'environnement définies

### Phase 2: Authentification
- ✅ Page d'inscription
- ✅ Profil utilisateur
- ✅ Synchronisation Auth0/D1

### Phase 3: Exercices
- ✅ Analyse vidéo
- ✅ Bibliothèque
- ✅ Favoris
- ✅ Filtres

### Phase 4: Matchs
- ✅ Création annonce
- ✅ Recherche
- ✅ Contacts
- ✅ Expiration

### Phase 5: Séances
- ✅ Session builder
- ✅ Adaptation IA
- ✅ Chronomètre
- ✅ Historique

### Phase 6: Paiements
- ✅ Stripe Checkout
- ✅ Webhooks
- ✅ Abonnements

### Phase 7: Optimisations
- ✅ Performance
- ✅ UX
- ✅ Tests

### Phase 8: Production
- ✅ Worker déployé
- ✅ Client déployé
- ✅ DNS configuré
- ✅ Tests E2E réussis

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

---

## 13. SYSTÈME DE PERMISSIONS GRANULAIRES KDUFOOT

### 13.1 Architecture des Permissions

**KduFoot utilise un système de permissions basé sur Auth0 avec 3 niveaux:**
1. **Permissions de base** (héritées du template)
2. **Permissions métier** (spécifiques aux fonctionnalités KduFoot)
3. **Permissions premium** (liées aux abonnements)

### 13.2 Liste Complète des Permissions

#### Permissions de Base (Template)

| Permission | Description | Scope |
|------------|-------------|-------|
| `read:api` | Lecture générale des données | Public |
| `write:api` | Écriture générale des données | Authentifié |

#### Permissions Métier (KduFoot)

| Permission | Description | Free | Pro | Ultime |
|------------|-------------|------|-----|--------|
| **Exercices** | | | | |
| `exercises:read` | Lire ses propres exercices | ✅ | ✅ | ✅ |
| `exercises:read_all` | Lire tous les exercices publics | ✅ | ✅ | ✅ |
| `exercises:create` | Créer des exercices | ✅ | ✅ | ✅ |
| `exercises:update` | Modifier ses exercices | ✅ | ✅ | ✅ |
| `exercises:delete` | Supprimer ses exercices | ✅ | ✅ | ✅ |
| `exercises:share` | Partager publiquement | ❌ | ✅ | ✅ |
| **Analyse Vidéo** | | | | |
| `videos:analyze` | Analyser vidéos courtes (<5 min) | 3/jour | ∞ | ∞ |
| `videos:analyze_long` | Analyser vidéos longues (>5 min) | ❌ | 10/jour | ∞ |
| `videos:analyze_batch` | Analyser en batch | ❌ | ❌ | ✅ |
| `videos:priority` | File prioritaire | ❌ | ✅ | ✅ |
| **Séances** | | | | |
| `sessions:create` | Créer des séances | 5 max | ∞ | ∞ |
| `sessions:adapt` | Adapter avec IA | ❌ | 3/mois | ∞ |
| `sessions:template` | Créer des templates | ❌ | ✅ | ✅ |
| `sessions:share` | Partager des séances | ❌ | ✅ | ✅ |
| **Matchs** | | | | |
| `matches:create` | Créer annonces | 2/mois | 10/mois | ∞ |
| `matches:premium` | Annonces mises en avant | ❌ | ✅ | ✅ |
| `matches:contact` | Contacter pour match | ✅ | ✅ | ✅ |
| **Export & Partage** | | | | |
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
| `admin:auth0` | Gérer permissions Auth0 | Admin |
| `coach:certified` | Badge coach certifié UEFA | Certified Coach |

---
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
  router.post('/api/v1/videos/analyze', async (request, params) => {
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

### 14.4 Configuration i18next

```typescript
// apps/client/src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des traductions
import baseEN from './locales/base/en-US.json';
import baseFR from './locales/base/fr-FR.json';
import kduFootEN from './locales/kdufoot/en-US.json';
import kduFootFR from './locales/kdufoot/fr-FR.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        base: baseEN,
        kdufoot: kduFootEN
      },
      fr: {
        base: baseFR,
        kdufoot: kduFootFR
      }
    },
    fallbackLng: 'fr',
    defaultNS: 'kdufoot',
    ns: ['base', 'kdufoot'],
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

### 14.2 Structure des Fichiers de Traduction

```json
// apps/client/src/locales/kdufoot/fr-FR.json
{
  "video": {
    "urlPlaceholder": "Collez le lien YouTube/Vimeo...",
    "analyze": "Analyser",
    "analyzing": "Analyse en cours...",
    "success": "{{count}} exercice(s) trouvé(s)",
    "error": "Erreur lors de l'analyse"
  },
  "exercise": {
    "title": "Titre",
    "synopsis": "Synopsis",
    "themes": "Thèmes",
    "favorite": "Ajouter aux favoris",
    "unfavorite": "Retirer des favoris",
    "addToSession": "Ajouter à la séance",
    "adapt": "Adapter"
  },
  "match": {
    "create": "Créer une annonce",
    "format": "Format",
    "venue": "Lieu",
    "date": "Date",
    "time": "Heure"
  },
  "session": {
    "create": "Nouvelle séance",
    "adapt": "Adapter",
    "timer": "Chronomètre",
    "export": "Exporter en PDF"
  },
  "permissions": {
    "quota": {
      "videos": "Quota vidéos: {{used}}/{{total}}",
      "sessions": "Séances: {{used}}/{{total}}",
      "matches": "Annonces: {{used}}/{{total}}"
    },
    "upgrade": "Passer à {{plan}} pour débloquer cette fonctionnalité"
  }
}
```

### 14.3 Utilisation dans les Composants

```typescript
import { useTranslation } from 'react-i18next';

export const ExampleComponent = () => {
  const { t } = useTranslation('kdufoot');

  return (
    <div>
      <h1>{t('video.analyze')}</h1>
      <p>{t('permissions.quota.videos', { used: 2, total: 3 })}</p>
    </div>
  );
};
```

### 14.4 Enums Traduits

```typescript
// apps/client/src/hooks/use-translated-enum.ts
import { useTranslation } from 'react-i18next';
import type { Theme, Category, Level } from '@/types/exercise.types';

export const useTranslatedEnum = () => {
  const { t } = useTranslation('kdufoot');

  return {
    getThemeLabel: (theme: Theme) => t(`enums.theme.${theme}`),
    getCategoryLabel: (category: Category) => t(`enums.category.${category}`),
    getLevelLabel: (level: Level) => t(`enums.level.${level}`)
  };
};
```

```json
// apps/client/src/locales/kdufoot/fr-FR.json
{
  "enums": {
    "theme": {
      "TECHNIQUE": "Technique",
      "PHYSIQUE": "Physique",
      "TACTIQUE": "Tactique",
      "FINITION": "Finition",
      "TRANSITION": "Transition"
    },
    "category": {
      "U7": "U7",
      "U9": "U9",
      "U11": "U11",
      "U13": "U13",
      "U15": "U15",
      "U17": "U17",
      "U19": "U19",
      "Séniors": "Séniors",
      "Vétérans": "Vétérans"
    },
    "level": {
      "Débutant": "Débutant",
      "Ligue": "Ligue",
      "Régional": "Régional",
      "National": "National",
      "Pro": "Professionnel"
    }
  }
}
```

### 14.5 Langues Supportées

- 🇫🇷 Français (fr-FR) - Principale
- 🇬🇧 Anglais (en-US)
- 🇪🇸 Espagnol (es-ES)
- 🇨🇳 Chinois (zh-CN)
- 🇸🇦 Arabe (ar-SA) - Support RTL
- 🇮🇱 Hébreu (he-IL) - Support RTL

### 14.6 Support RTL (Right-to-Left)

```typescript
// apps/client/src/i18n.ts
i18n.on('languageChanged', (lng) => {
  const dir = ['ar', 'he'].includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
});
```

### 14.7 Sélecteur de Langue

```typescript
// apps/client/src/components/language-switch.tsx
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' }
];

export const LanguageSwitch = () => {
  const { i18n } = useTranslation();

  const currentLang = languages.find(lang => lang.code === i18n.language);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="light">
          {currentLang?.flag} {currentLang?.label}
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="Language selection"
        onAction={(key) => i18n.changeLanguage(key as string)}
      >
        {languages.map(lang => (
          <DropdownItem key={lang.code}>
            {lang.flag} {lang.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
```

### 14.8 Persistence

```typescript
// La langue est automatiquement sauvegardée dans localStorage
// via i18next-browser-languagedetector

// Ordre de détection:
// 1. localStorage ('i18nextLng')
// 2. navigator.language
// 3. Fallback: 'fr'
```

### 14.9 Bonnes Pratiques

#### Nommage Cohérent
- Sections: `video`, `exercise`, `match`, `session`
- Actions: `create`, `edit`, `delete`, `save`
- Messages: `success`, `error`, `warning`

#### Éviter la Duplication
```json
// ❌ Mauvais
{
  "exercise.save": "Enregistrer",
  "match.save": "Enregistrer"
}

// ✅ Bon
{
  "common.save": "Enregistrer"
}
```

### 14.10 Checklist i18n

#### Traductions
- ✅ Traduire toutes les sections
- ✅ Ajouter enums traduits
- ✅ Ajouter messages erreur/succès
- ✅ Traduire permissions et quotas

#### Tests
- ✅ Tester changement de langue
- ✅ Tester interpolation
- ✅ Tester support RTL
- ✅ Vérifier persistance (localStorage)

---

## 15. GESTION GRAPHIQUE DES PERMISSIONS AUTH0

> **Note:** Cette section s'inspire du dépôt [feedback-flow](https://github.com/sctg-development/feedback-flow) qui implémente un système de gestion graphique des permissions Auth0 optimisé pour rester dans le free tier.

### 15.1 Architecture & Objectif

**Problématique:**  
Le dashboard Auth0 nécessite une connexion manuelle pour gérer les permissions des utilisateurs, ce qui est peu pratique en production. De plus, chaque appel à l'Auth0 Management API consomme des quotas.

**Solution:**  
Implémenter un endpoint `/api/__auth0/token` côté Cloudflare Worker qui:
1. Obtient un token Management API via Client Credentials grant
2. Cache le token dans Cloudflare KV pour réduire les appels Auth0
3. Permet aux administrateurs de gérer graphiquement les permissions depuis l'interface KduFoot

**Avantages:**
- ✅ Gestion permissions sans quitter l'application
- ✅ Réduction des appels Auth0 (free tier friendly)
- ✅ UX améliorée pour les administrateurs
- ✅ Audit trail des modifications

### 15.2 Configuration Auth0 Management API

#### Créer une Machine-to-Machine Application

1. **Aller dans Auth0 Dashboard** → Applications → Create Application
2. **Nom:** `KduFoot Management API`
3. **Type:** `Machine to Machine Applications`
4. **API:** `Auth0 Management API`
5. **Permissions requises:**
   - `read:users`
   - `update:users`
   - `read:users_app_metadata`
   - `update:users_app_metadata`
   - `read:user_idp_tokens`
   - `create:user_permissions`
   - `read:user_permissions`
   - `update:user_permissions`
   - `delete:user_permissions`

#### Variables d'Environnement

```env
# .env (root)
# Auth0 Management API Configuration
AUTH0_MANAGEMENT_API_CLIENT_ID=your_management_client_id
AUTH0_MANAGEMENT_API_CLIENT_SECRET=your_management_client_secret
AUTH0_DOMAIN=kdufoot.eu.auth0.com

# Permission pour accéder à l'endpoint management
ADMIN_AUTH0_PERMISSION=admin:auth0
```

```jsonc
// apps/cloudflare-worker/wrangler.jsonc
{
  "name": "kdufoot-api",
  "vars": {
    "AUTH0_DOMAIN": "kdufoot.eu.auth0.com",
    "ADMIN_AUTH0_PERMISSION": "admin:auth0"
  },
  "kv_namespaces": [
    {
      "binding": "KV_CACHE",
      "id": "your-kv-namespace-id",
      "preview_id": "your-preview-kv-id"
    }
  ]
}
```

### 15.3 Implémentation Cloudflare Worker

#### Endpoint `/api/__auth0/token`

```typescript
// apps/cloudflare-worker/src/routes/system/index.ts
import { Router } from '../router';
import { decodeJwt } from 'jose';
import type { Env } from '../../types/env';

export interface Auth0ManagementTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  from_cache?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export const setupSystemRoutes = async (router: Router, env: Env) => {
  /**
   * POST /api/__auth0/token
   *
   * Obtient un token Auth0 Management API et le cache dans KV
   * Protégé par ADMIN_AUTH0_PERMISSION
   *
   * @returns {Auth0ManagementTokenResponse} Token avec metadata
   */
  router.post(
    '/api/__auth0/token',
    async (request) => {
      try {
        // Validation des variables d'environnement
        if (!env.AUTH0_MANAGEMENT_API_CLIENT_ID || 
            !env.AUTH0_MANAGEMENT_API_CLIENT_SECRET || 
            !env.AUTH0_DOMAIN) {
          const err: ErrorResponse = { 
            success: false, 
            error: 'Auth0 configuration is missing' 
          };
          return new Response(JSON.stringify(err, null, 2), {
            status: 500,
            headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const tokenUrl = `https://${env.AUTH0_DOMAIN}/oauth/token`;
        const audience = `https://${env.AUTH0_DOMAIN}/api/v2/`;
        const cacheKey = 'auth0:management_token';

        // ✅ ÉTAPE 1: Vérifier le cache KV
        if (env.KV_CACHE) {
          try {
            const cached = await env.KV_CACHE.get(cacheKey);
            
            if (cached) {
              let parsed: { token?: string; exp?: number } | null = null;
              
              try {
                parsed = JSON.parse(cached);
              } catch (e) {
                // cached value may be raw token string
              }

              const token = parsed?.token ?? cached;
              let exp = parsed?.exp;

              // Décoder le JWT pour obtenir l'expiration si non présente
              if (!exp && token) {
                try {
                  const decoded = decodeJwt(token);
                  exp = (decoded?.exp as number) || undefined;
                } catch (_) {
                  exp = undefined;
                }
              }

              // Vérifier si le token est encore valide (marge de 5 secondes)
              if (exp) {
                const now = Math.floor(Date.now() / 1000);
                if (exp > now + 5) {
                  const expires_in = exp - now;
                  const cachedResult: Auth0ManagementTokenResponse = {
                    access_token: token,
                    token_type: 'Bearer',
                    expires_in,
                    from_cache: true
                  };
                  
                  console.log('[Auth0] Token retrieved from cache, expires in', expires_in, 'seconds');
                  
                  return new Response(JSON.stringify(cachedResult, null, 2), {
                    status: 200,
                    headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
                  });
                }
              }
            }
          } catch (e) {
            console.warn('[Auth0] KV_CACHE access failed, requesting new token:', String(e));
          }
        }

        // ✅ ÉTAPE 2: Demander un nouveau token à Auth0
        console.log('[Auth0] Requesting new token from:', tokenUrl);

        const body = {
          client_id: env.AUTH0_MANAGEMENT_API_CLIENT_ID,
          client_secret: env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
          audience,
          grant_type: 'client_credentials'
        };

        const resp = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          const err: ErrorResponse = { 
            success: false, 
            error: `Failed to retrieve token: ${errorText}` 
          };
          return new Response(JSON.stringify(err, null, 2), {
            status: 500,
            headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const data = (await resp.json()) as {
          access_token?: string;
          token_type?: string;
          expires_in?: number;
          [key: string]: any;
        };

        if (!data || !data.access_token) {
          const err: ErrorResponse = { 
            success: false, 
            error: 'Invalid response from Auth0: no access_token returned' 
          };
          return new Response(JSON.stringify(err, null, 2), {
            status: 500,
            headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // ✅ ÉTAPE 3: Cacher le token dans KV
        if (env.KV_CACHE && data.access_token) {
          try {
            const token = data.access_token as string;
            const now = Math.floor(Date.now() / 1000);
            let exp: number | undefined;

            if (typeof data.expires_in === 'number') {
              exp = now + Math.floor(data.expires_in as number);
            } else {
              try {
                const decoded = decodeJwt(token);
                exp = (decoded?.exp as number) || undefined;
              } catch (_) {
                exp = undefined;
              }
            }

            if (exp && exp > now + 5) {
              const kvValue = JSON.stringify({ token, exp });
              await env.KV_CACHE.put(cacheKey, kvValue, { expiration: exp });
              console.log('[Auth0] Token cached in KV, expires at', new Date(exp * 1000).toISOString());
            }
          } catch (e) {
            console.warn('[Auth0] Failed to store token in KV_CACHE:', String(e));
          }
        }

        const result: Auth0ManagementTokenResponse = {
          access_token: data.access_token as string,
          token_type: data.token_type as string | undefined,
          expires_in: data.expires_in as number | undefined,
          from_cache: false
        };

        return new Response(JSON.stringify(result, null, 2), {
          status: 200,
          headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        const err: ErrorResponse = { success: false, error: String(error) };
        return new Response(JSON.stringify(err, null, 2), {
          status: 500,
          headers: { ...router.corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    },
    env.ADMIN_AUTH0_PERMISSION // ⚠️ Protection par permission admin
  );
};
```

### 15.4 Types TypeScript

```typescript
// apps/client/src/types/auth0.types.ts
export interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  nickname?: string;
  picture?: string;
  identities?: Auth0Identity[];
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
  logins_count?: number;
}

export interface Auth0Identity {
  connection: string;
  provider: string;
  user_id: string;
  isSocial: boolean;
}

export interface Auth0Permission {
  permission_name: string;
  resource_server_identifier: string;
  resource_server_name?: string;
  description?: string;
}

export interface Auth0ManagementTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  from_cache?: boolean;
}

export interface Auth0PermissionsUpdate {
  userId: string;
  permissions: {
    add?: string[];
    remove?: string[];
  };
}
```

### 15.5 Service Auth0 Management (Client)

```typescript
// apps/client/src/services/auth0.service.ts
import { useSecuredApi } from '@/authentication';
import type { 
  Auth0User, 
  Auth0Permission, 
  Auth0ManagementTokenResponse 
} from '@/types/auth0.types';

export const useAuth0ManagementService = () => {
  const { postJson, getJson, deleteJson } = useSecuredApi();

  return {
    /**
     * Obtient un token Management API (caché côté Worker)
     */
    async getManagementToken(): Promise<Auth0ManagementTokenResponse> {
      return await postJson(`${import.meta.env.API_BASE_URL}/api/__auth0/token`, {});
    },

    /**
     * Liste tous les utilisateurs Auth0
     */
    async listUsers(token: string, page: number = 0, perPage: number = 50): Promise<Auth0User[]> {
      const response = await fetch(
        `https://${import.meta.env.AUTH0_DOMAIN}/api/v2/users?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      return await response.json();
    },

    /**
     * Récupère les permissions d'un utilisateur
     */
    async getUserPermissions(token: string, userId: string): Promise<Auth0Permission[]> {
      const response = await fetch(
        `https://${import.meta.env.AUTH0_DOMAIN}/api/v2/users/${userId}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.statusText}`);
      }

      return await response.json();
    },

    /**
     * Ajoute une permission à un utilisateur
     */
    async addPermissionToUser(
      token: string, 
      userId: string, 
      permission: string
    ): Promise<void> {
      const response = await fetch(
        `https://${import.meta.env.AUTH0_DOMAIN}/api/v2/users/${userId}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            permissions: [{
              permission_name: permission,
              resource_server_identifier: import.meta.env.AUTH0_AUDIENCE
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add permission: ${response.statusText}`);
      }
    },

    /**
     * Retire une permission d'un utilisateur
     */
    async removePermissionFromUser(
      token: string, 
      userId: string, 
      permission: string
    ): Promise<void> {
      const response = await fetch(
        `https://${import.meta.env.AUTH0_DOMAIN}/api/v2/users/${userId}/permissions`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            permissions: [{
              permission_name: permission,
              resource_server_identifier: import.meta.env.AUTH0_AUDIENCE
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove permission: ${response.statusText}`);
      }
    },

    /**
     * Supprime un utilisateur Auth0
     */
    async deleteUser(token: string, userId: string): Promise<void> {
      const response = await fetch(
        `https://${import.meta.env.AUTH0_DOMAIN}/api/v2/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
    }
  };
};
```

### 15.6 Page de Gestion des Permissions

```typescript
// apps/client/src/pages/admin-users.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@heroui/button';
import { Checkbox } from '@heroui/checkbox';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import { addToast } from '@heroui/toast';
import DefaultLayout from '@/layouts/default';
import { useAuth0ManagementService } from '@/services/auth0.service';
import type { Auth0User, Auth0Permission } from '@/types/auth0.types';

export default function AdminUsersPage() {
  const { user } = useAuth0();
  const currentUserId = (user?.sub || '').toString().trim();
  const { t } = useTranslation('kdufoot');
  
  const {
    getManagementToken,
    listUsers,
    getUserPermissions,
    addPermissionToUser,
    removePermissionFromUser,
    deleteUser
  } = useAuth0ManagementService();

  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<Auth0User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Auth0User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, Record<string, boolean>>>({});

  // Matrice des permissions KduFoot
  const permissionMap = {
    'videos:analyze': t('permissions.videos_analyze'),
    'videos:analyze_long': t('permissions.videos_analyze_long'),
    'exercises:create': t('permissions.exercises_create'),
    'exercises:share': t('permissions.exercises_share'),
    'sessions:adapt': t('permissions.sessions_adapt'),
    'matches:create': t('permissions.matches_create'),
    'export:pdf': t('permissions.export_pdf'),
    'admin:users': t('permissions.admin_users'),
    'admin:auth0': t('permissions.admin_auth0')
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Obtenir le token Management API
        const tokenResponse = await getManagementToken();
        setToken(tokenResponse.access_token);

        // Charger les utilisateurs
        if (tokenResponse.access_token) {
          const fetchedUsers = await listUsers(tokenResponse.access_token);
          setUsers(fetchedUsers);

          if (tokenResponse.from_cache) {
            addToast({
              title: t('admin.token_from_cache'),
              variant: 'solid',
              timeout: 3000
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addToast({
          title: t('error'),
          description: t('admin.failed_load_users'),
          variant: 'solid',
          timeout: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const openUserModal = async (user: Auth0User) => {
    if (!token) {
      addToast({
        title: t('error'),
        description: t('admin.no_token'),
        variant: 'solid',
        timeout: 5000
      });
      return;
    }

    setSelectedUser(user);
    setModalOpen(true);
    setModalLoading(true);

    try {
      const userPerms = await getUserPermissions(token, user.user_id);
      const audience = import.meta.env.AUTH0_AUDIENCE || '';
      
      // Filtrer les permissions pour notre API
      let permNames = (userPerms || [])
        .filter((p: Auth0Permission) => {
          const rs = (p.resource_server_identifier || '') as string;
          return rs === audience || rs.includes(audience);
        })
        .map((p: Auth0Permission) => p.permission_name);

      // Initialiser l'état d'édition
      const permissionsState: Record<string, boolean> = {};
      Object.keys(permissionMap).forEach(perm => {
        permissionsState[perm] = permNames.includes(perm);
      });

      setEditing(prev => ({
        ...prev,
        [user.user_id]: permissionsState
      }));
    } catch (err) {
      console.error(err);
      addToast({
        title: t('error'),
        description: t('admin.failed_load_permissions'),
        variant: 'solid',
        timeout: 5000
      });
    } finally {
      setModalLoading(false);
    }
  };

  const togglePermission = (userId: string, permission: string) => {
    setEditing(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [permission]: !(prev[userId]?.[permission] ?? false)
      }
    }));
  };

  const saveUserPermissions = async (userId: string) => {
    if (!token) return;

    try {
      const currentState = editing[userId] || {};
      const originalPerms = await getUserPermissions(token, userId);
      
      const audience = import.meta.env.AUTH0_AUDIENCE;
      const originalPermNames = originalPerms
        .filter(p => p.resource_server_identifier === audience)
        .map(p => p.permission_name);

      // Déterminer les permissions à ajouter/retirer
      for (const [perm, shouldHave] of Object.entries(currentState)) {
        const hasIt = originalPermNames.includes(perm);

        if (shouldHave && !hasIt) {
          await addPermissionToUser(token, userId, perm);
        } else if (!shouldHave && hasIt) {
          await removePermissionFromUser(token, userId, perm);
        }
      }

      addToast({
        title: t('success'),
        description: t('admin.permissions_updated'),
        variant: 'solid',
        timeout: 5000
      });

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast({
        title: t('error'),
        description: t('admin.failed_update_permissions'),
        variant: 'solid',
        timeout: 5000
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      addToast({
        title: t('error'),
        description: t('admin.cannot_delete_self'),
        variant: 'solid'
      });
      return;
    }

    if (!token) return;

    if (!confirm(t('admin.confirm_delete_user'))) return;

    try {
      await deleteUser(token, userId);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      
      addToast({
        title: t('success'),
        description: t('admin.user_deleted'),
        variant: 'solid',
        timeout: 5000
      });

      if (selectedUser?.user_id === userId) {
        setModalOpen(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: t('error'),
        description: t('admin.failed_delete_user'),
        variant: 'solid',
        timeout: 5000
      });
    }
  };

  return (
    <DefaultLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">{t('admin.users_permissions')}</h1>
        
        {isLoading ? (
          <div>{t('loading')}</div>
        ) : (
          <Table aria-label={t('admin.users_table')}>
            <TableHeader>
              <TableColumn>{t('admin.user')}</TableColumn>
              <TableColumn>{t('admin.email')}</TableColumn>
              <TableColumn>{t('admin.created_at')}</TableColumn>
              <TableColumn>{t('admin.actions')}</TableColumn>
            </TableHeader>
            <TableBody items={users} emptyContent={t('admin.no_users')}>
              {(user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.name || user.nickname || user.user_id}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        color="primary"
                        onPress={() => openUserModal(user)}
                      >
                        {t('admin.edit_permissions')}
                      </Button>
                      
                      {user.user_id !== currentUserId && (
                        <Button 
                          size="sm" 
                          color="danger"
                          onPress={() => handleDeleteUser(user.user_id)}
                        >
                          {t('admin.delete')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* Modal de gestion des permissions */}
        {modalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-11/12 max-w-2xl">
              <h3 className="text-lg font-bold mb-4">
                {t('admin.permissions_for', { name: selectedUser.name || selectedUser.email })}
              </h3>

              {modalLoading ? (
                <div>{t('loading')}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(permissionMap).map(([perm, label]) => (
                    <label key={perm} className="flex items-center gap-2">
                      <Checkbox
                        isSelected={!!(editing[selectedUser.user_id]?.[perm])}
                        onValueChange={() => togglePermission(selectedUser.user_id, perm)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  color="primary"
                  onPress={() => saveUserPermissions(selectedUser.user_id)}
                >
                  {t('admin.save')}
                </Button>
                
                <Button
                  variant="bordered"
                  onPress={() => setModalOpen(false)}
                >
                  {t('admin.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
```

### 15.7 Traductions

```json
// apps/client/src/locales/kdufoot/fr-FR.json
{
  "admin": {
    "users_permissions": "Gestion des Utilisateurs & Permissions",
    "users_table": "Liste des utilisateurs",
    "no_users": "Aucun utilisateur",
    "user": "Utilisateur",
    "email": "Email",
    "created_at": "Inscrit le",
    "actions": "Actions",
    "edit_permissions": "Gérer les permissions",
    "delete": "Supprimer",
    "permissions_for": "Permissions pour {name}",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "token_from_cache": "Token récupéré du cache (économie API)",
    "failed_load_users": "Échec du chargement des utilisateurs",
    "failed_load_permissions": "Échec du chargement des permissions",
    "failed_update_permissions": "Échec de la mise à jour des permissions",
    "failed_delete_user": "Échec de la suppression de l'utilisateur",
    "permissions_updated": "Permissions mises à jour",
    "user_deleted": "Utilisateur supprimé",
    "cannot_delete_self": "Vous ne pouvez pas supprimer votre propre compte",
    "confirm_delete_user": "Confirmer la suppression de cet utilisateur ?",
    "no_token": "Aucun token disponible"
  },
  "permissions": {
    "videos_analyze": "Analyser vidéos courtes",
    "videos_analyze_long": "Analyser vidéos longues",
    "exercises_create": "Créer exercices",
    "exercises_share": "Partager exercices",
    "sessions_adapt": "Adapter séances (IA)",
    "matches_create": "Créer annonces matchs",
    "export_pdf": "Exporter en PDF",
    "admin_users": "Gérer utilisateurs",
    "admin_auth0": "Gérer permissions Auth0"
  }
}
```

### 15.8 Protection de la Route Admin

```typescript
// apps/client/src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { useSecuredApi } from '@/authentication';
import AdminUsersPage from '@/pages/admin-users';

function App() {
  const { hasPermission } = useSecuredApi();

  return (
    <Routes>
      {/* ... autres routes ... */}
      
      {/* Route protégée admin */}
      {hasPermission('admin:auth0') && (
        <Route path="/admin/users" element={<AdminUsersPage />} />
      )}
    </Routes>
  );
}
```

### 15.9 Navbar avec Lien Admin

```typescript
// apps/client/src/components/navbar.tsx
import { Link } from 'react-router-dom';
import { useSecuredApi } from '@/authentication';

export const Navbar = () => {
  const { hasPermission } = useSecuredApi();

  return (
    <nav>
      {/* ... autres liens ... */}
      
      {hasPermission('admin:auth0') && (
        <Link to="/admin/users">
          Admin
        </Link>
      )}
    </nav>
  );
};
```

### 15.10 Avantages de cette Approche

| Aspect | Sans endpoint custom | Avec `/api/__auth0/token` |
|--------|---------------------|---------------------------|
| **Connexion dashboard** | Nécessaire à chaque fois | Jamais |
| **Appels Auth0** | ~10-50/jour | ~1-5/jour (cache KV) |
| **UX Admin** | Dashboard externe | Interface intégrée |
| **Audit** | Logs Auth0 seulement | Logs applicatifs + Auth0 |
| **Coût** | Risque dépassement free tier | Optimisé free tier |
| **Temps gestion** | ~5-10 min/utilisateur | ~30 sec/utilisateur |

### 15.11 Sécurité

**Points de vigilance:**
- ⚠️ **JAMAIS** exposer `AUTH0_MANAGEMENT_API_CLIENT_SECRET` au frontend
- ✅ **TOUJOURS** protéger `/api/__auth0/token` avec `ADMIN_AUTH0_PERMISSION`
- ✅ **TOUJOURS** valider les permissions côté Worker avant chaque opération
- ✅ **JAMAIS** faire confiance aux permissions envoyées par le client
- ✅ **TOUJOURS** logger les modifications de permissions pour audit

### 15.12 Monitoring & Debug

```typescript
// apps/cloudflare-worker/src/routes/system/index.ts
// Ajouter des logs pour le monitoring

console.log('[Auth0] Token request', {
  from_cache: false,
  user_id: request.user?.sub,
  timestamp: new Date().toISOString()
});

// En production, envoyer à un service d'analytics
if (env.ENVIRONMENT === 'production') {
  await env.ANALYTICS?.writeDataPoint({
    blobs: ['auth0_token_request'],
    doubles:, [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154010031/69edb0de-ec16-47f6-8960-1e8bc0f54d30/login_redirect.html)
    indexes: [request.user?.sub]
  });
}
```

### 15.13 Checklist Implémentation

- ✅ Créer Machine-to-Machine Application Auth0
- ✅ Configurer permissions Management API
- ✅ Ajouter variables d'environnement
- ✅ Créer namespace KV Cloudflare
- ✅ Implémenter endpoint `/api/__auth0/token`
- ✅ Implémenter service Auth0 Management (client)
- ✅ Créer page admin permissions
- ✅ Protéger la route avec `admin:auth0`
- ✅ Ajouter traductions
- ✅ Tester en local
- ✅ Tester cache KV
- ✅ Tester expiration token
- ✅ Déployer en production
- ✅ Vérifier logs
- ✅ Documenter pour l'équipe

---

## 16. STANDARDS DE CODAGE & BONNES PRATIQUES

### 16.1 Langues & Documentation

**Important:** L'équipe est francophone, mais **tout le code, les identifiants, les commentaires JSDoc/TSDoc, les annotations OpenAPI et les messages de commit doivent être rédigés en anglais**. Cela facilite la revue de code, l'intégration d'outils externes et la collaboration open source.

### 16.2 Conventions de nommage

- **Fichiers & dossiers:** kebab-case (ex. `exercise-card.tsx`, `use-exercises.ts`).
- **Exceptions:** fichiers de configuration (`tsconfig.json`, `vite.config.ts`), migrations (`0001_initial.sql`).
- **Composants React & Types/Interfaces:** PascalCase (ex. `ExerciseCard`, `TrainingSession`).
- **Hooks & services:** `use-xxx.ts` ou `xxx.service.ts` en kebab-case (ex. `use-exercises.ts`, `exercise.service.ts`).
- **Fonctions & variables:** camelCase (ex. `getExercises`, `isLoading`).
- **Constantes:** SCREAMING_SNAKE pour les variables d'environnement, sinon camelCase pour les constantes locales.
- **Enums:** Nom en PascalCase, valeurs en UPPER_SNAKE ou PascalCase selon l'usage (privilégier des chaînes sémantiques, voir l'enum `Permissions`).

### 16.3 Qualité & linters

- **ESLint & Prettier:** appliqués (utiliser les configurations du projet). Corrigez les problèmes de lint avant d'ouvrir une PR.
- **TypeScript strict:** conservez `strict: true`, évitez `any`. Privilégiez les types de retour explicites pour les fonctions exportées.
- **Préférer `const` et `readonly`** lorsque possible ; n'utilisez `let` que pour des réaffectations.
- **Gestion des erreurs:** gérez systématiquement les erreurs (try/catch), renvoyez des structures d'erreur claires et typées.
- **Logging:** évitez `console.log` en production ; utilisez une abstraction de logger et supprimez les logs de debug avant la PR.
- **Accessibilité:** respectez les bonnes pratiques a11y pour les composants interactifs (ARIA, navigation au clavier).

### 16.4 Tests & CI

- **Tests:** tests unitaires pour les services/hooks et les routes du worker (Vitest). Ajoutez des tests pour les cas limites et la gestion des permissions.
- **E2E:** ajoutez des tests d'intégration au fur et mesure que les fonctionnalités se stabilisent.
- **Couverture:** les nouvelles fonctionnalités doivent être couvertes ; le job CI doit exécuter les tests et la vérification des types.
### 16.5 JSDoc / TSDoc (ENGLISH) 📝
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

### 16.6 Annotations OpenAPI (swagger-jsdoc) 📚
- Ajoutez des commentaires JSDoc OpenAPI au-dessus des handlers de route dans les **Cloudflare Worker routes**. La documentation doit être rédigée en anglais.
- Utilisez `swagger-jsdoc` ou un équivalent pour générer `openapi.json` dans le CI ou via un script.

Example JSDoc for an API route:

```ts
/**
 * @openapi
 * /api/v1/videos/analyze:
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
router.post('/api/v1/videos/analyze', async (request) => { /* handler */ });
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

### 16.7 Commentaires & Documentation

- **JSDoc/TSDoc:** présent pour les fonctions exportées et la logique importante.
- **OpenAPI:** annotations pertinentes ajoutées/mises à jour pour les changements d'API.
- **README & docs:** tenez à jour la documentation technique dans `ANALYSE_TECHNIQUE.md` et les README des packages.

### 16.8 Architecture & Patterns

- **Composants purs:** privilégiez les composants fonctionnels purs ; utilisez les hooks pour la logique.
- **Services:** isolez la logique métier dans les services (pattern hook-based).
- **State management:** utilisez React Context + useReducer pour l'état global ; évitez les bibliothèques tierces sauf si nécessaire.
- **Error boundaries:** enveloppez les composants critiques pour gérer les erreurs React.
- **Loading states:** affichez des skeletons pour une UX fluide.

### 16.9 Pull Requests & commits

- **Commits:** format [Conventional Commits](https://www.conventionalcommits.org/) (ex. `feat(video): analyze endpoint`, `fix(exercise): handle missing svg`). Messages en anglais.
- **Description PR:** expliquez *pourquoi*, pas seulement *ce qui* a été fait. Liez l'issue, listez les choix de conception importants et joignez captures d'écran ou exemples `curl` pour les changements API.
- **Checklist de review:** lint, type-check, tests, build, mises à jour de la doc OpenAPI, clés i18n.

### 16.10 Performance

- **Code splitting:** utilisez lazy loading pour les routes et composants volumineux.
- **Images:** optimisez (WebP, lazy loading, responsive images).
- **Caching:** utilisez KV Cloudflare pour les données fréquemment accédées (tokens, clubs, etc.).
- **Bundling:** vérifiez la taille des bundles (Vite Rollup Visualizer).

### 16.11 Internationalisation (i18n)

- Toutes les **chaînes visibles** doivent provenir des clés de traduction (`kdufoot` namespace). Les clés et les commentaires dans le code doivent être en anglais.
- Évitez les chaînes codées en dur dans les composants.

### 16.12 Checklist PR rapide

- ✅ Code en anglais (identifiants, commentaires)
- ✅ JSDoc/TSDoc présent pour les fonctions exportées et la logique importante
- ✅ Annotations OpenAPI pertinentes ajoutées/mises à jour pour les changements d'API
- ✅ Tests unitaires ajoutés/mis à jour, CI vert
- ✅ Clés i18n ajoutées pour les nouveaux textes visibles
- ✅ Lint & format OK, vérification des types passe
- ✅ i18n keys added for new visible texts
- ✅ Lint & format OK, type-check passes

---

## 17. RESPECT DES LICENCES & COPYRIGHT

**Rappel:** le template et certains fichiers sources sont soumis à des licences (ex. AGPL-3.0-or-later). Le respect des mentions de licence et des en-têtes copyright est **obligatoire**.

- **Vérifier la licence principale:** consultez le fichier `LICENSE` à la racine et respectez la licence indiquée (AGPL-3.0-or-later) ainsi que les licences des dépendances.
- **Conserver les en-têtes existants:** pour tout fichier provenant du template ou inspiré du template, ne retirez pas l'en-tête de copyright ni la mention de licence d'origine.
- **Fichiers modifiés:** conservez l'en-tête original et, si nécessaire, ajoutez une ligne indiquant la modification (en anglais). Exemple:

```ts
/*
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * Modified by [Name] 2026
 * License: AGPL-3.0-or-later
 */
```

- **Nouveaux fichiers:** si le fichier n'hérite pas d'un header existant, ajoutez un header minimal (en anglais):

```ts
/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */
```

- **Code tiers:** quand vous réutilisez du code tiers (snippets, bibliothèques), conservez les mentions de licence attachées à ce code et ajoutez une note d'attribution dans le fichier ou dans la PR.

### Contrôles & automations recommandés

- Ajoutez un job CI `license-check` (ex. `license-checker`, `reuse`, ou équivalent) pour détecter les dépendances et incompatibilités de licence.
- Ajoutez un hook `pre-commit` pour vérifier la présence d'un header de licence sur les fichiers sources modifiés.
- Dans les PRs qui ajoutent du code tiers ou modifient des licences, documentez explicitement l'origine et la licence du code ajouté.

**Non-respect:** la suppression ou l'altération des mentions de licence peut entraîner des risques juridiques ; contactez immédiatement l'auteur du template avant de proposer un changement de licence.

---

## 18. PLAN D'ACTIONS DÉTAILLÉ POUR IA DE CODAGE

> **Section spéciale pour assistants IA de codage**  
> Ce plan décompose la migration en tâches atomiques et séquentielles, avec des instructions explicites, des vérifications systématiques et des exemples de code complets.

### 18.1 Méthodologie pour l'IA

#### Principes de travail

1. **Exécution séquentielle stricte:** Ne jamais passer à l'étape N+1 avant validation complète de l'étape N
2. **Vérification systématique:** Chaque étape doit se terminer par une validation technique
3. **Isolation des modifications:** Une étape = un domaine fonctionnel = un commit
4. **Documentation inline:** Chaque fonction/composant créé doit avoir sa JSDoc complète
5. **Tests en continu:** Lancer `yarn dev:env` après chaque groupe de modifications
6. **Rollback immédiat:** Si une étape échoue, revenir à l'état précédent avant de continuer

#### Format des instructions

Chaque tâche suit ce template:

```
TÂCHE-XXX: [Titre court]

OBJECTIF: Description claire du résultat attendu

PRÉREQUIS:
- Étapes précédentes complétées
- Fichiers/dépendances nécessaires

FICHIERS CONCERNÉS:
- Liste exhaustive des fichiers à créer/modifier

INSTRUCTIONS:
1. Instruction précise avec commande/code
2. Vérification intermédiaire
3. ...

VALIDATION:
- Critères de succès mesurables
- Commandes de test

CODE ATTENDU:
[Exemple complet si pertinent]
```

---

### 18.2 Phase 0: Préparation de l'Environnement

#### TÂCHE-001: Cloner et Initialiser le Projet

**OBJECTIF:** Obtenir une copie locale fonctionnelle du template

**PRÉREQUIS:**
- Git installé
- Node.js >= 20.x
- Yarn 4 (via Corepack)

**INSTRUCTIONS:**

1. Cloner le template dans un nouveau répertoire:
```bash
git clone https://github.com/sctg-development/vite-react-heroui-auth0-template.git kdufoot
cd kdufoot
```

2. Supprimer l'historique Git existant et réinitialiser:
```bash
rm -rf .git
git init
git add .
git commit -m "chore: initial commit from template"
```

3. Activer Corepack et configurer Yarn 4:
```bash
corepack enable
yarn set version 4.12.0
```

4. Installer les dépendances:
```bash
yarn install
```

**VALIDATION:**
- ✅ Le répertoire `kdufoot/` existe
- ✅ `yarn --version` retourne `4.12.x`
- ✅ `node_modules/` est présent
- ✅ Aucune erreur d'installation

**VÉRIFICATION:**
```bash
yarn --version
ls -la | grep node_modules
```

---

#### TÂCHE-002: Renommer le Projet

**OBJECTIF:** Adapter les métadonnées du projet pour KduFoot

**PRÉREQUIS:** TÂCHE-001 complétée

**FICHIERS CONCERNÉS:**
- `package.json` (root)
- `apps/client/package.json`
- `apps/cloudflare-worker/package.json`
- `apps/cloudflare-worker/wrangler.jsonc`

**INSTRUCTIONS:**

1. Modifier `package.json` (root):
```json
{
  "name": "kdufoot",
  "description": "KduFoot - Plateforme d'analyse vidéo pour entraîneurs de football",
  "repository": {
    "type": "git",
    "url": "https://github.com/aeltorio/KduFoot.git"
  }
}
```

2. Modifier `apps/client/package.json`:
```json
{
  "name": "@kdufoot/client",
  "description": "KduFoot Web Client"
}
```

3. Modifier `apps/cloudflare-worker/package.json`:
```json
{
  "name": "@kdufoot/api",
  "description": "KduFoot API (Cloudflare Workers)"
}
```

4. Modifier `apps/cloudflare-worker/wrangler.jsonc`:
```jsonc
{
  "name": "kdufoot-api",
  "compatibility_date": "2024-01-01"
}
```

**VALIDATION:**
- ✅ Tous les fichiers modifiés
- ✅ Pas d'erreur de syntaxe JSON
- ✅ `yarn install` s'exécute sans erreur

**VÉRIFICATION:**
```bash
grep -r "vite-react-heroui" package.json
# Ne doit rien retourner
```

---

#### TÂCHE-003: Configurer Auth0

**OBJECTIF:** Créer les applications Auth0 nécessaires

**PRÉREQUIS:**
- Compte Auth0 créé
- Tenant configuré (ex: `kdufoot.eu.auth0.com`)

**INSTRUCTIONS:**

1. **Créer l'Application KduFoot (SPA):**
   - Aller dans Auth0 Dashboard → Applications → Create Application
   - Nom: `KduFoot`
   - Type: `Single Page Application`
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
   - Noter: `Client ID`

2. **Créer l'API KduFoot:**
   - Auth0 Dashboard → Applications → APIs → Create API
   - Nom: `KduFoot API`
   - Identifier (Audience): `https://api.kdufoot.com`
   - Signing Algorithm: `RS256`
   - Enable RBAC: `true`
   - Add Permissions in the Access Token: `true`

3. **Ajouter les permissions à l'API:**
   Dans l'onglet Permissions de l'API, ajouter:
   ```
   read:api             Lecture générale des données
   write:api            Écriture générale des données
   exercises:read       Lire ses propres exercices
   exercises:create     Créer des exercices
   exercises:update     Modifier ses exercices
   exercises:delete     Supprimer ses exercices
   exercises:share      Partager publiquement
   videos:analyze       Analyser vidéos courtes
   videos:analyze:long  Analyser vidéos longues
   sessions:create      Créer des séances
   sessions:adapt       Adapter avec IA
   matches:create       Créer annonces
   matches:contact      Contacter pour match
   export:pdf           Exporter en PDF
   admin:users          Gérer utilisateurs
   admin:auth0          Gérer permissions Auth0
   ```

4. **Créer l'Application Management API (M2M):**
   - Applications → Create Application
   - Nom: `KduFoot Management API`
   - Type: `Machine to Machine`
   - API: `Auth0 Management API`
   - Permissions:
     - `read:users`
     - `update:users`
     - `read:users_app_metadata`
     - `update:users_app_metadata`
     - `read:user_permissions`
     - `create:user_permissions`
     - `update:user_permissions`
     - `delete:user_permissions`
   - Noter: `Client ID`, `Client Secret`

5. **Créer le rôle "Free User":**
   - User Management → Roles → Create Role
   - Nom: `Free User`
   - Description: `Default role for free tier users`
   - Permissions:
     - `read:api`
     - `write:api`
     - `exercises:read`
     - `exercises:create`
     - `exercises:update`
     - `exercises:delete`
     - `videos:analyze`
     - `sessions:create`
     - `matches:create`
     - `matches:contact`
   - Noter: `Role ID`

**VALIDATION:**
- ✅ Application SPA créée
- ✅ API créée avec 15+ permissions
- ✅ Application M2M créée avec permissions Management API
- ✅ Rôle "Free User" créé
- ✅ Tous les IDs/secrets notés

---

#### TÂCHE-004: Configurer les Variables d'Environnement

**OBJECTIF:** Créer le fichier `.env` avec toutes les variables nécessaires

**PRÉREQUIS:** TÂCHE-003 complétée

**FICHIERS CONCERNÉS:**
- `.env` (root, à créer)

**INSTRUCTIONS:**

1. Copier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Remplir `.env` avec les valeurs Auth0:
```env
# Authentication
AUTHENTICATION_PROVIDER_TYPE=auth0
AUTH0_CLIENT_ID=<votre_client_id_spa>
AUTH0_CLIENT_SECRET=<secret_optionnel>
AUTH0_DOMAIN=kdufoot.eu.auth0.com
AUTH0_SCOPE="openid profile email read:api write:api"
AUTH0_AUDIENCE=https://api.kdufoot.com

# Auth0 Management API
AUTH0_MANAGEMENT_API_CLIENT_ID=<votre_m2m_client_id>
AUTH0_MANAGEMENT_API_CLIENT_SECRET=<votre_m2m_secret>
ADMIN_AUTH0_PERMISSION=admin:auth0

# API Configuration
API_BASE_URL=http://localhost:8787/api/v1
CORS_ORIGIN=http://localhost:5173

# Permissions
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api

# Google Gemini (à remplir plus tard)
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash

# Cloudflare (à remplir après création ressources)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
```

3. Ajouter `.env` au `.gitignore` (déjà fait normalement):
```bash
echo ".env" >> .gitignore
```

**VALIDATION:**
- ✅ Fichier `.env` créé
- ✅ Toutes les variables Auth0 renseignées
- ✅ `.env` dans `.gitignore`

**VÉRIFICATION:**
```bash
cat .env | grep AUTH0_CLIENT_ID
git status | grep .env
# .env ne doit pas apparaître dans les fichiers tracked
```

---

#### TÂCHE-005: Configurer Cloudflare D1

**OBJECTIF:** Créer la base de données D1 pour KduFoot

**PRÉREQUIS:**
- Compte Cloudflare créé
- `wrangler` CLI installé (`yarn global add wrangler` ou via npx)
- Authentification Cloudflare (`wrangler login`)

**INSTRUCTIONS:**

1. Se placer dans le répertoire worker:
```bash
cd apps/cloudflare-worker
```

2. Créer la base de données D1:
```bash
wrangler d1 create kdufoot-db
```

3. Noter l'output qui contient:
```toml
[[d1_databases]]
binding = "DB"
database_name = "kdufoot-db"
database_id = "<VOTRE_DATABASE_ID>"
```

4. Mettre à jour `wrangler.jsonc`:
```jsonc
{
  "name": "kdufoot-api",
  "compatibility_date": "2024-01-01",
  "main": "src/index.ts",

  "vars": {
    "ENVIRONMENT": "development",
    "CORS_ORIGIN": "http://localhost:5173",
    "AUTH0_DOMAIN": "kdufoot.eu.auth0.com",
    "AUTH0_AUDIENCE": "https://api.kdufoot.com",
    "ADMIN_AUTH0_PERMISSION": "admin:auth0"
  },

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kdufoot-db",
      "database_id": "<VOTRE_DATABASE_ID>"
    }
  ]
}
```

5. Mettre à jour le fichier `.env` (root):
```env
CLOUDFLARE_DATABASE_ID=<VOTRE_DATABASE_ID>
```

**VALIDATION:**
- ✅ Commande `wrangler d1 create` réussie
- ✅ `database_id` récupéré et ajouté à `wrangler.jsonc`
- ✅ `.env` mis à jour

**VÉRIFICATION:**
```bash
wrangler d1 list
# Doit afficher kdufoot-db
```

---

#### TÂCHE-006: Créer les Buckets R2

**OBJECTIF:** Créer les buckets R2 pour stocker vidéos et thumbnails

**PRÉREQUIS:** TÂCHE-005 complétée

**INSTRUCTIONS:**

1. Créer le bucket vidéos:
```bash
wrangler r2 bucket create kdufoot-videos
```

2. Créer le bucket thumbnails:
```bash
wrangler r2 bucket create kdufoot-thumbnails
```

3. Mettre à jour `wrangler.jsonc`:
```jsonc
{
  // ... configuration existante ...

  "r2_buckets": [
    {
      "binding": "VIDEOS_BUCKET",
      "bucket_name": "kdufoot-videos"
    },
    {
      "binding": "THUMBNAILS_BUCKET",
      "bucket_name": "kdufoot-thumbnails"
    }
  ]
}
```

**VALIDATION:**
- ✅ Deux buckets créés
- ✅ `wrangler.jsonc` mis à jour

**VÉRIFICATION:**
```bash
wrangler r2 bucket list
# Doit afficher kdufoot-videos et kdufoot-thumbnails
```

---

#### TÂCHE-007: Créer le Namespace KV

**OBJECTIF:** Créer le namespace KV pour le cache

**PRÉREQUIS:** TÂCHE-006 complétée

**INSTRUCTIONS:**

1. Créer le namespace KV:
```bash
wrangler kv:namespace create KV_CACHE
```

2. Noter l'output:
```toml
{ binding = "KV_CACHE", id = "<VOTRE_KV_ID>" }
```

3. Créer le namespace de preview:
```bash
wrangler kv:namespace create KV_CACHE --preview
```

4. Mettre à jour `wrangler.jsonc`:
```jsonc
{
  // ... configuration existante ...

  "kv_namespaces": [
    {
      "binding": "KV_CACHE",
      "id": "<VOTRE_KV_ID>",
      "preview_id": "<VOTRE_PREVIEW_KV_ID>"
    }
  ]
}
```

**VALIDATION:**
- ✅ Namespace KV créé
- ✅ Preview namespace créé
- ✅ `wrangler.jsonc` mis à jour

**VÉRIFICATION:**
```bash
wrangler kv:namespace list
```

---

#### TÂCHE-008: Créer les Migrations D1

**OBJECTIF:** Créer les fichiers de migration SQL

**PRÉREQUIS:** TÂCHE-005 complétée

**FICHIERS CONCERNÉS:**
- `apps/cloudflare-worker/migrations/0001_initial.sql` (à créer)
- `apps/cloudflare-worker/migrations/0002_add_clubs.sql` (à créer)
- `apps/cloudflare-worker/migrations/0003_add_exercises.sql` (à créer)
- `apps/cloudflare-worker/migrations/0004_add_matches.sql` (à créer)
- `apps/cloudflare-worker/migrations/0005_add_sessions.sql` (à créer)

**INSTRUCTIONS:**

1. Créer le répertoire migrations:
```bash
mkdir -p apps/cloudflare-worker/migrations
```

2. Créer `0001_initial.sql`:
```sql
-- apps/cloudflare-worker/migrations/0001_initial.sql
-- Table users (synchronized with Auth0)
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
CREATE INDEX idx_users_subscription ON users(subscription);
```

3. Créer `0002_add_clubs.sql`:
```sql
-- apps/cloudflare-worker/migrations/0002_add_clubs.sql
-- Table clubs (SIRENE API cache)
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
CREATE INDEX idx_clubs_name ON clubs(name);
```

4. Créer `0003_add_exercises.sql`:
```sql
-- apps/cloudflare-worker/migrations/0003_add_exercises.sql
-- Table exercises
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  svg_schema TEXT,
  themes TEXT,
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

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
```

5. Créer `0004_add_matches.sql`:
```sql
-- apps/cloudflare-worker/migrations/0004_add_matches.sql
-- Table matches
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('11v11', '8v8', '5v5', 'Futsal')),
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
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
CREATE INDEX idx_matches_category ON matches(category);

-- Table match_contacts
CREATE TABLE match_contacts (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT,
  contacted_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_match_contacts_match_id ON match_contacts(match_id);
```

6. Créer `0005_add_sessions.sql`:
```sql
-- apps/cloudflare-worker/migrations/0005_add_sessions.sql
-- Table training_sessions
CREATE TABLE training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  category TEXT,
  level TEXT,
  total_duration INTEGER,
  constraints TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'completed')),
  scheduled_date TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON training_sessions(user_id);
CREATE INDEX idx_sessions_status ON training_sessions(status);
CREATE INDEX idx_sessions_scheduled_date ON training_sessions(scheduled_date);

-- Table session_exercises (junction table)
CREATE TABLE session_exercises (
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration INTEGER,
  players INTEGER,
  adapted_data TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, exercise_id),
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_exercises_session_id ON session_exercises(session_id);

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

7. Appliquer les migrations en local:
```bash
cd apps/cloudflare-worker
wrangler d1 migrations apply kdufoot-db --local
```

**VALIDATION:**
- ✅ 5 fichiers de migration créés
- ✅ Migrations appliquées sans erreur
- ✅ Base D1 locale fonctionnelle

**VÉRIFICATION:**
```bash
wrangler d1 migrations list kdufoot-db --local
# Doit afficher les 5 migrations appliquées
```

---

#### TÂCHE-009: Tester le Setup Initial

**OBJECTIF:** Vérifier que l'environnement de développement fonctionne

**PRÉREQUIS:** Toutes les tâches 001-008 complétées

**INSTRUCTIONS:**

1. Retourner à la racine du projet:
```bash
cd ../..
```

2. Lancer l'environnement de développement:
```bash
yarn dev:env
```

3. Vérifier les outputs:
   - Le client React doit démarrer sur `http://localhost:5173`
   - Le worker doit démarrer sur `http://localhost:8787`
   - Aucune erreur dans les logs

4. Tester l'authentification:
   - Ouvrir `http://localhost:5173`
   - Cliquer sur "Se connecter"
   - Vérifier la redirection Auth0
   - Se connecter avec un compte test
   - Vérifier le retour sur l'application

**VALIDATION:**
- ✅ `yarn dev:env` démarre sans erreur
- ✅ Client accessible sur port 5173
- ✅ Worker accessible sur port 8787
- ✅ Auth0 login fonctionnel
- ✅ Token JWT récupéré

**VÉRIFICATION:**
```bash
curl http://localhost:8787/api/health
# Doit retourner un status OK
```

---

### 18.3 Phase 1: Types TypeScript & Configuration

#### TÂCHE-010: Créer les Types Exercise

**OBJECTIF:** Définir les types TypeScript pour les exercices

**PRÉREQUIS:** TÂCHE-009 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/types/exercise.types.ts` (à créer)

**INSTRUCTIONS:**

1. Créer le répertoire types:
```bash
mkdir -p apps/client/src/types
```

2. Créer `exercise.types.ts` avec le contenu complet (voir section 5 du document ANALYSE_TECHNIQUE.md)

**CODE COMPLET:**
```typescript
// apps/client/src/types/exercise.types.ts

/**
 * Exercise theme categories
 * Based on UEFA Pro coaching methodology
 */
export type Theme = 
  | 'TECHNIQUE' 
  | 'PHYSIQUE' 
  | 'TACTIQUE' 
  | 'FINITION' 
  | 'TRANSITION';

/**
 * Age categories for football training
 */
export type Category = 
  | 'U7' 
  | 'U9' 
  | 'U11' 
  | 'U13' 
  | 'U15' 
  | 'U17' 
  | 'U19' 
  | 'Séniors' 
  | 'Vétérans';

/**
 * Skill levels for exercises
 */
export type Level = 
  | 'Débutant' 
  | 'Ligue' 
  | 'Régional' 
  | 'National' 
  | 'Pro';

/**
 * Complete exercise data model
 * Synchronized with D1 database schema
 */
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
  video_start_seconds?: number;
}

export interface AdaptationConstraints {
  players: number;
  duration?: number;
  space?: string;
  category?: Category;
  level?: Level;
  equipment?: string;
}

export interface ExerciseFilters {
  themes?: Theme[];
  category?: Category;
  level?: Level;
  minPlayers?: number;
  maxPlayers?: number;
  search?: string;
}
```

**VALIDATION:**
- ✅ Fichier créé
- ✅ Aucune erreur TypeScript (`yarn type-check` dans apps/client)
- ✅ Tous les types exportés

**VÉRIFICATION:**
```bash
cd apps/client
yarn type-check
```

---

#### TÂCHE-011: Créer les Types Match

**OBJECTIF:** Définir les types TypeScript pour les matchs amicaux

**PRÉREQUIS:** TÂCHE-010 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/types/match.types.ts` (à créer)

**CODE COMPLET:**
```typescript
// apps/client/src/types/match.types.ts

import type { Category } from './exercise.types';

export type Format = '11v11' | '8v8' | '5v5' | 'Futsal';
export type Venue = 'Domicile' | 'Extérieur' | 'Neutre';
export type MatchStatus = 'active' | 'found' | 'expired';

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
  cached_at?: string;
  expires_at?: string;
}

export interface MatchContact {
  user_id: string;
  message: string;
  contacted_at: string;
}

export interface Match {
  id: string;
  owner_id: string;
  club_id: string;
  club: Club;
  category: Category;
  format: Format;
  match_date: string;
  match_time: string;
  venue: Venue;
  email: string;
  phone: string;
  notes?: string;
  status: MatchStatus;
  contacts: MatchContact[];
  created_at: string;
  updated_at: string;
}

export interface CreateMatchDto {
  siret: string;
  category: Category;
  format: Format;
  match_date: string;
  match_time: string;
  venue: Venue;
  email: string;
  phone: string;
  notes?: string;
}

export interface MatchFilters {
  category?: Category;
  format?: Format;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  maxDistance?: number;
  status?: MatchStatus;
}

export interface SiretLookupResult {
  siret: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  isFootballClub: boolean;
  latitude?: number;
  longitude?: number;
}
```

**VALIDATION:**
- ✅ Fichier créé
- ✅ Import de `Category` depuis `exercise.types.ts` fonctionne
- ✅ Aucune erreur TypeScript

---

#### TÂCHE-012: Créer les Types Session

**OBJECTIF:** Définir les types TypeScript pour les séances d'entraînement

**PRÉREQUIS:** TÂCHE-011 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/types/session.types.ts` (à créer)

**CODE COMPLET:**
```typescript
// apps/client/src/types/session.types.ts

import type { Exercise, Category, Level } from './exercise.types';

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
  equipment?: string;
}

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

export interface CreateSessionDto {
  name?: string;
  category?: Category;
  level?: Level;
  total_duration?: number;
  scheduled_date?: string;
  exercise_ids: string[];
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

**VALIDATION:**
- ✅ Fichier créé avec imports corrects
- ✅ Aucune erreur TypeScript

---

#### TÂCHE-013: Créer les Types Auth0

**OBJECTIF:** Définir les types pour l'intégration Auth0 Management API

**PRÉREQUIS:** TÂCHE-012 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/types/auth0.types.ts` (à créer)

**CODE COMPLET:**
```typescript
// apps/client/src/types/auth0.types.ts

export interface Auth0Identity {
  connection: string;
  provider: string;
  user_id: string;
  isSocial: boolean;
}

export interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  nickname?: string;
  picture?: string;
  identities?: Auth0Identity[];
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
  logins_count?: number;
}

export interface Auth0Permission {
  permission_name: string;
  resource_server_identifier: string;
  resource_server_name?: string;
  description?: string;
}

export interface Auth0ManagementTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  from_cache?: boolean;
}

export interface Auth0PermissionsUpdate {
  userId: string;
  permissions: {
    add?: string[];
    remove?: string[];
  };
}
```

**VALIDATION:**
- ✅ Fichier créé
- ✅ Aucune erreur TypeScript

---

#### TÂCHE-014: Créer l'Index des Types

**OBJECTIF:** Centraliser les exports de types

**PRÉREQUIS:** TÂCHE-013 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/types/index.ts` (à créer)

**CODE COMPLET:**
```typescript
// apps/client/src/types/index.ts

export * from './exercise.types';
export * from './match.types';
export * from './session.types';
export * from './auth0.types';
```

**VALIDATION:**
- ✅ Fichier créé
- ✅ Aucune erreur TypeScript
- ✅ Imports fonctionnels depuis `@/types`

---

#### TÂCHE-015: Mettre à Jour la Configuration Site

**OBJECTIF:** Adapter `site.ts` pour KduFoot

**PRÉREQUIS:** TÂCHE-014 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/config/site.ts`

**CODE COMPLET:**
```typescript
// apps/client/src/config/site.ts

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "KduFoot",
  description: "Plateforme d'analyse vidéo et de gestion d'entraînements pour coachs de football",
  navItems: [
    {
      label: "home",
      href: "/",
    },
    {
      label: "library",
      href: "/library",
      protected: true,
    },
    {
      label: "favorites",
      href: "/favorites",
      protected: true,
    },
    {
      label: "matches",
      href: "/matches",
      protected: true,
    },
    {
      label: "training",
      href: "/training",
      protected: true,
    },
    {
      label: "history",
      href: "/history",
      protected: true,
    },
    {
      label: "pricing",
      href: "/pricing",
    },
    {
      label: "about",
      href: "/about",
    },
  ],
  navMenuItems: [
    {
      label: "home",
      href: "/",
    },
    {
      label: "library",
      href: "/library",
    },
    {
      label: "favorites",
      href: "/favorites",
    },
    {
      label: "matches",
      href: "/matches",
    },
    {
      label: "training",
      href: "/training",
    },
    {
      label: "history",
      href: "/history",
    },
    {
      label: "pricing",
      href: "/pricing",
    },
    {
      label: "about",
      href: "/about",
    },
    {
      label: "logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/aeltorio/KduFoot",
    docs: "https://github.com/aeltorio/KduFoot/wiki",
  },
};
```

**VALIDATION:**
- ✅ Fichier modifié
- ✅ Navigation adaptée à KduFoot
- ✅ Aucune erreur TypeScript

---

#### TÂCHE-016: Créer la Matrice de Permissions

**OBJECTIF:** Définir la configuration des permissions par abonnement

**PRÉREQUIS:** TÂCHE-015 complétée

**FICHIERS CONCERNÉS:**
- `apps/client/src/config/permissions-matrix.ts` (à créer)

**CODE COMPLET:**
```typescript
// apps/client/src/config/permissions-matrix.ts

export enum Permission {
  READ_API = 'read:api',
  WRITE_API = 'write:api',
  EXERCISES_READ = 'exercises:read',
  EXERCISES_READ_ALL = 'exercises:read:all',
  EXERCISES_CREATE = 'exercises:create',
  EXERCISES_UPDATE = 'exercises:update',
  EXERCISES_DELETE = 'exercises:delete',
  EXERCISES_SHARE = 'exercises:share',
  VIDEOS_ANALYZE = 'videos:analyze',
  VIDEOS_ANALYZE_LONG = 'videos:analyze:long',
  VIDEOS_ANALYZE_BATCH = 'videos:analyze:batch',
  VIDEOS_PRIORITY = 'videos:priority',
  SESSIONS_CREATE = 'sessions:create',
  SESSIONS_ADAPT = 'sessions:adapt',
  SESSIONS_TEMPLATE = 'sessions:template',
  SESSIONS_SHARE = 'sessions:share',
  MATCHES_CREATE = 'matches:create',
  MATCHES_PREMIUM = 'matches:premium',
  MATCHES_CONTACT = 'matches:contact',
  EXPORT_PDF = 'export:pdf',
  EXPORT_VIDEO = 'export:video',
  SHARE_LIBRARY = 'share:library',
  ADMIN_USERS = 'admin:users',
  ADMIN_EXERCISES = 'admin:exercises',
  ADMIN_MATCHES = 'admin:matches',
  ADMIN_ANALYTICS = 'admin:analytics',
  ADMIN_BILLING = 'admin:billing',
  ADMIN_AUTH0 = 'admin:auth0',
  COACH_CERTIFIED = 'coach:certified',
}

export type Subscription = 'Free' | 'Pro' | 'Ultime';

export const PERMISSIONS_MATRIX: Record<Subscription, Permission[]> = {
  Free: [
    Permission.READ_API,
    Permission.WRITE_API,
    Permission.EXERCISES_READ,
    Permission.EXERCISES_CREATE,
    Permission.EXERCISES_UPDATE,
    Permission.EXERCISES_DELETE,
    Permission.VIDEOS_ANALYZE,
    Permission.SESSIONS_CREATE,
    Permission.SESSIONS_ADAPT,
    Permission.MATCHES_CREATE,
    Permission.MATCHES_CONTACT,
  ],

  Pro: [
    Permission.READ_API,
    Permission.WRITE_API,
    Permission.EXERCISES_READ,
    Permission.EXERCISES_READ_ALL,
    Permission.EXERCISES_CREATE,
    Permission.EXERCISES_UPDATE,
    Permission.EXERCISES_DELETE,
    Permission.EXERCISES_SHARE,
    Permission.VIDEOS_ANALYZE,
    Permission.VIDEOS_ANALYZE_LONG,
    Permission.SESSIONS_CREATE,
    Permission.SESSIONS_ADAPT,
    Permission.SESSIONS_TEMPLATE,
    Permission.SESSIONS_SHARE,
    Permission.MATCHES_CREATE,
    Permission.MATCHES_PREMIUM,
    Permission.MATCHES_CONTACT,
    Permission.EXPORT_PDF,
    Permission.SHARE_LIBRARY,
  ],

  Ultime: [
    Permission.READ_API,
    Permission.WRITE_API,
    Permission.EXERCISES_READ,
    Permission.EXERCISES_READ_ALL,
    Permission.EXERCISES_CREATE,
    Permission.EXERCISES_UPDATE,
    Permission.EXERCISES_DELETE,
    Permission.EXERCISES_SHARE,
    Permission.VIDEOS_ANALYZE,
    Permission.VIDEOS_ANALYZE_LONG,
    Permission.VIDEOS_ANALYZE_BATCH,
    Permission.VIDEOS_PRIORITY,
    Permission.SESSIONS_CREATE,
    Permission.SESSIONS_ADAPT,
    Permission.SESSIONS_TEMPLATE,
    Permission.SESSIONS_SHARE,
    Permission.MATCHES_CREATE,
    Permission.MATCHES_PREMIUM,
    Permission.MATCHES_CONTACT,
    Permission.EXPORT_PDF,
    Permission.EXPORT_VIDEO,
    Permission.SHARE_LIBRARY,
  ],
};

export interface QuotaConfig {
  limit: number;
  period: 'daily' | 'monthly';
}

export const QUOTA_CONFIG: Partial<Record<Permission, QuotaConfig>> = {
  [Permission.VIDEOS_ANALYZE]: {
    limit: 3,
    period: 'daily',
  },
  [Permission.VIDEOS_ANALYZE_LONG]: {
    limit: 10,
    period: 'daily',
  },
  [Permission.SESSIONS_ADAPT]: {
    limit: 3,
    period: 'monthly',
  },
  [Permission.MATCHES_CREATE]: {
    limit: 2,
    period: 'monthly',
  },
};
```

**VALIDATION:**
- ✅ Fichier créé
- ✅ Enum `Permission` complet (27 permissions)
- ✅ Matrice par abonnement définie
- ✅ Configuration des quotas définie
- ✅ Aucune erreur TypeScript

---

### 18.4 Instructions de Commit pour Phase 1

**Après TÂCHE-016, créer un commit:**

```bash
cd apps/client
yarn type-check
cd ../..

git add .
git commit -m "feat(types): add complete TypeScript type system for KduFoot

- Created exercise.types.ts with Exercise, Theme, Category, Level types
- Created match.types.ts with Match, Club, Format, Venue types
- Created session.types.ts with TrainingSession, SessionExercise types
- Created auth0.types.ts for Auth0 Management API integration
- Updated site.ts configuration for KduFoot navigation
- Created permissions-matrix.ts with 27 permissions and quota config

All types are documented with JSDoc comments and validated with 
TypeScript compiler. No type errors.

Refs: TÂCHE-010 through TÂCHE-016"
```

---

### 18.5 Phase 2: Backend Cloudflare Worker (Aperçu)

Les prochaines tâches couvriront:

#### TÂCHE-017: Créer les Types Worker
- `apps/cloudflare-worker/src/types/permissions.ts`
- `apps/cloudflare-worker/src/types/env.d.ts`

#### TÂCHE-018: Créer le Middleware d'Authentification
- `apps/cloudflare-worker/src/middleware/auth.middleware.ts`

#### TÂCHE-019: Créer le Middleware de Permissions
- `apps/cloudflare-worker/src/middleware/permissions.middleware.ts`

#### TÂCHE-020: Créer les Routes Videos
- `apps/cloudflare-worker/src/routes/videos.ts`

#### TÂCHE-021: Créer les Routes Exercises
- `apps/cloudflare-worker/src/routes/exercises.ts`

... et ainsi de suite pour toutes les fonctionnalités.

---

### 18.6 Points de Contrôle Critiques

À chaque fin de phase, l'IA doit:

1. **Exécuter les vérifications:**
```bash
yarn type-check
yarn lint
yarn build
yarn dev:env
```

2. **Tester manuellement** les fonctionnalités implémentées

3. **Documenter** les problèmes rencontrés

4. **Créer un commit** avec un message détaillé (Conventional Commits)

5. **Mettre à jour** ANALYSE_TECHNIQUE.md si nécessaire

---

### 18.7 Développement Itératif pour l'IA

**RÈGLES D'OR:**

1. ⛔ **NE JAMAIS** créer de code sans JSDoc complète
2. ⛔ **NE JAMAIS** passer à la tâche suivante sans validation
3. ⛔ **NE JAMAIS** ignorer les erreurs TypeScript/ESLint
4. ✅ **TOUJOURS** tester après chaque modification
5. ✅ **TOUJOURS** créer des commits atomiques
6. ✅ **TOUJOURS** suivre les conventions de nommage
7. ✅ **TOUJOURS** documenter en anglais (code/comments)
8. ✅ **TOUJOURS** utiliser les types stricts TypeScript

**En cas d'erreur:**
1. Arrêter immédiatement
2. Lire le message d'erreur complet
3. Revenir à l'état fonctionnel précédent (`git reset` si nécessaire)
4. Analyser la cause
5. Corriger puis re-tester
6. Ne continuer qu'après validation complète


## 19. CONCLUSION

Résumé : Ce document définit une feuille de route claire et pragmatique pour migrer KduFoot vers une architecture moderne (Turborepo, Cloudflare Workers, Auth0). L'approche par phases minimise les risques techniques tout en permettant des livraisons itératives et mesurables.

Bénéfices clés :
- ✅ Réduction des coûts d'infrastructure (objectif : < 30€/mois en charge nominale pour l'étape de démarrage)
- ✅ Meilleure maintenabilité et sécurité (TypeScript strict, Auth0, tests)
- ✅ Scalabilité et performance (edge + R2 + D1)
- ✅ Expérience utilisateur améliorée et internationalisation prête à l'emploi

Priorités immédiates (Phase 1 - 2 semaines) :
1. Initialiser le monorepo (Turborepo) + config CI/CD (lint, type-check, tests)
2. Déployer un environnement de dev Workers (wrangler + secrets) et config R2/D1
3. Intégrer Auth0 minimal (login + check-token) et matrix permissions de base
4. Ajouter monitoring basique (logs, Sentry) et job `license-check`

Critères d'acceptation / KPI (pour chaque phase) :
- Tests unitaires et lint verts sur CI
- Endpoints API couverts par des tests d'intégration
- Migration de données testée sur staging avec rollback
- Latence p95 API < 300ms sur charges nominales
- Coût mensuel estimé validé par simulation (R2/D1/Workers)

Risques principaux & mitigations :
- Migration des données : faire des scripts idempotents + tests de non-régression
- Permissions/Auth0 : phase pilote avec roles limités puis extension
- Coûts imprévus : surveiller usage, définir quotas et alertes


