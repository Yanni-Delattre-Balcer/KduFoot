# KduFoot

Plateforme de matchs et tournois de football amateur.

## Prérequis

- **Node.js** v20+ (recommandé v24)
- **npm** v9+
- **Wrangler CLI** (`npm i -g wrangler`)  
- Un compte **Auth0** configuré (domaine, client ID, audience)
- Un compte **Cloudflare** avec Workers, D1, KV et Durable Objects activés

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/your-org/kdufoot.git && cd kdufoot

# 2. Installer les dépendances
npm install

# 3. Copier les variables d'environnement
cp .env.example .env
# Remplir les valeurs Auth0, Cloudflare, Google Maps API, etc.

# 4. Créer la base de données D1 locale
cd apps/cloudflare-worker
npx wrangler d1 execute kdufoot-db --local --file=src/migrations/001_init.sql

# 5. Retour à la racine
cd ../..
```

## Développement local

```bash
# Lancer le Worker + le client en simultané
npm run dev:env

# Ou séparément :
cd apps/cloudflare-worker && npm run dev   # API Worker sur :8787
cd apps/client && npm run dev:env          # Frontend Vite sur :5173
```

## Tests

```bash
# Lancer les tests du Worker
cd apps/cloudflare-worker
npm test

# Avec couverture
npm test -- --coverage
```

## Type-check et Lint

```bash
cd apps/cloudflare-worker
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
```

## Déploiement

Le déploiement est automatisé via GitHub Actions sur la branche `V2` :

1. Push sur `V2`
2. CI exécute : `type-check` → `test` → `build` → déploiement Cloudflare

Pour un déploiement manuel :
```bash
cd apps/cloudflare-worker
npx wrangler deploy
```

## Architecture

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour la documentation technique complète.

## Contribution

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les directives de contribution.
