# Contribuer à KduFoot

Bienvenue sur le projet KduFoot ! Voici les directives pour assurer le maintien du plus haut niveau de qualité lors des audits de code.

## Prérequis

- **Node.js** ≥ 20
- **npm** ≥ 10
- Compte **Cloudflare** (Workers + D1 + KV)
- Compte **Auth0** (dev tenant)

## Installation

```bash
git clone <repo>
cd projet_philippe
npm install          # installe les dépendances du monorepo
cp .env.example .env # configurer les variables d'environnement
```

## Commandes principales

| Commande | Description |
|---|---|
| `npm run dev` | Lance le client (Vite) + le worker (Wrangler) en dev |
| `npm run build` | Build de production (client + worker) |
| `npm run test` | Tests Vitest (client + worker) |
| `npm run test -- --coverage` | Tests avec couverture |
| `npm run lint` | ESLint sur le monorepo |
| `npx tsc --noEmit` | Vérification TypeScript sans build |

## Structure du Monorepo

```
apps/
├── client/           # React 19 + Vite 7 (SPA PWA)
│   └── src/
│       ├── authentication/   # Auth0/Dex providers
│       ├── components/       # Composants réutilisables
│       ├── hooks/            # Custom hooks
│       ├── pages/            # Routes (lazy-loaded)
│       └── contexts/         # React contexts
└── cloudflare-worker/        # Cloudflare Workers (API REST)
    └── src/
        ├── routes/           # Route handlers
        ├── services/         # Logique métier
        ├── types/            # Types partagés
        └── utils/            # Utilitaires (validation, DB, broadcast)
```

## Conventions de Code

- **TypeScript strict** : L'utilisation de `any` est strictement interdite. Si le type n'est pas connu, utiliser `unknown` ou une interface spécifique.
- Les types transverses doivent être définis et centralisés dans `apps/cloudflare-worker/src/types/index.ts`.
- **Fichiers Modulaires** : Ne pas dépasser 300 lignes pour un contrôleur. Si ce seuil est dépassé, découper en sous-modules thématiques.
- **Imports** : Utiliser les imports directs (pas les barrels) pour les composants lourds afin d'éviter les dépendances circulaires. Ex : `import { useSecuredApi } from "@/authentication/auth-components"` plutôt que `from "@/authentication"`.
- **Console** : `console.error()` et `console.warn()` autorisés pour les erreurs. `console.log()` interdit en production — supprimer avant merge.

## Tests et Intégration Continue

- Le backend utilise **Vitest** pour ses tests unitaires et d'intégration (`__tests__/`).
- Le client utilise **Vitest** + **jsdom** pour les tests de composants.
- **Seuil de couverture minimal** : Bloqué à 70% dans `vitest.config.mts`.
- Chaque PR modifiant un comportement doit inclure/mettre à jour les tests associés.
- Les tests sensibles aux fuseaux horaires doivent utiliser des dates locales cohérentes (pas mixer `toISOString()` et `toTimeString()`).

## Sécurité & API

- Ne jamais retourner les détails d'exécution (comme `e.message`) aux utilisateurs dans les routes REST. Utiliser des messages de status HTTP adéquats (403, 404, 500).
- Toujours encapsuler les routes avec les middlewares de vérification Auth0 si elles exposent des ressources sensibles.
- Valider les UUIDs avec `requireValidUUID()` sur toutes les routes `/:id`.
- Utiliser la validation Zod pour tous les corps de requête entrants.
- Les permissions sont scopées à la Request (jamais sur le Router) — voir ADR-005.

## Accessibilité & UX

- Les labels ARIA (`aria-label`) sont obligatoires sur les éléments interactifs sans texte (icon-only).
- Vérifier le fonctionnement des "focus-traps" dans chaque modal pour la navigabilité clavier.
- Tout élément avec `role="button"` doit avoir `tabIndex={0}` et un handler `onKeyDown` pour Enter/Space.
- Les contrastes doivent toujours respecter la norme WCAG AA (ratio ≥ 4.5:1). Utiliser `text-default-400` minimum pour le texte secondaire sur fond sombre. Ne pas combiner `text-default-400` avec des opacités réduites.
- Ne jamais bloquer le zoom utilisateur (`user-scalable=0`, `maximum-scale=1`).

## RGPD

- Export des données personnelles disponible (PDF/JSON) via `/api/me/export`.
- Suppression de compte intégrale (Auth0 + D1) via `/api/me`.
- Audit trail sur les actions sensibles.
- Consentement cookies explicite via `CookieConsentProvider`.

## Architecture Decision Records (ADR)

Les décisions architecturales majeures sont documentées dans `docs/adr/`. Consulter avant de proposer un changement structurel :

- **ADR-001** : Cloudflare Workers comme runtime backend
- **ADR-002** : Auth0 pour l'authentification
- **ADR-003** : D1 (SQLite) comme base de données
- **ADR-004** : PWA Offline-First avec Workbox
- **ADR-005** : Auth et permissions scopées à la Request
- **ADR-006** : WebSocket temps réel via Durable Objects
- **ADR-007** : Rate Limiting distribué via KV Store

## Workflow Git

1. Créer une branche depuis `V2` : `git checkout -b feat/ma-feature V2`
2. Développer + tests + lint
3. Ouvrir une PR vers `V2`
4. Review obligatoire avant merge

Merci de contribuer à faire de KduFoot une plateforme irréprochable !
