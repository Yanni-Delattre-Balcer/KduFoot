# ADR-003 — Cloudflare D1 (SQLite) comme base de données

**Date** : 2024-02
**Statut** : Accepté
**Décideurs** : Ronan LE MEILLAT

---

## Contexte

L'application nécessite une base de données relationnelle pour stocker utilisateurs, matchs, tournois, exercices, participations et clubs. La base doit être :
- Accessible depuis Cloudflare Workers (pas de TCP, uniquement HTTP/bindings)
- Cohérente (pas d'éventuellement-cohérent comme KV)
- Peu coûteuse au démarrage

Alternatives évaluées :
- **Cloudflare D1** (SQLite managé sur Cloudflare)
- **PlanetScale** (MySQL serverless)
- **Supabase** (PostgreSQL managé)
- **Turso** (SQLite distribué libsql)
- **Neon** (PostgreSQL serverless)

## Décision

Utiliser **Cloudflare D1** (SQLite) avec :
- Migrations SQL versionnées dans `migrations/` (0001 → 0028+)
- Requêtes préparées via `env.DB.prepare(...).bind(...).first/all/run()`
- `DB.batch()` pour les opérations multi-requêtes atomiques
- Soft deletes et audit log via `deleted_at`, `updated_at` (migration 0028)

## Justification

| Critère | D1 (SQLite) | PlanetScale | Supabase | Turso |
|---|---|---|---|---|
| Binding natif Workers | Oui | Non (HTTP) | Non (HTTP) | Non (HTTP) |
| Latence | ~1-5ms | ~20-50ms | ~20-50ms | ~5-20ms |
| Free tier | 5M reads/jour | 5B rows reads | 500MB | 500 DB |
| Coût ($) | $0.75/M reads | $39/mois | $25/mois | $29/mois |
| Migrations | wrangler d1 | Vitess schema | SQL | libsql |
| SQLite compatible | Oui | Non | Non | Oui |

D1 offre la latence la plus faible car le binding est une connexion directe sans HTTP (même processus V8).

## Schema de migration

Les migrations sont numérotées séquentiellement :
```
migrations/
  0001_initial.sql          ← Table users
  0002_add_clubs.sql        ← Table clubs
  ...
  0028_audit_and_soft_deletes.sql  ← Soft deletes + audit
```

Commandes :
```bash
npm run d1:create          # Appliquer migrations (local)
npm run d1:create:remote   # Appliquer migrations (production)
```

## Contraintes SQLite à respecter

1. **Pas de `ALTER COLUMN`** : utiliser une nouvelle migration avec `ADD COLUMN` + migration de données.
2. **Pas de `BOOLEAN` natif** : utiliser `INTEGER` (0/1). Le type `is_blocked` en est un exemple.
3. **`RETURNING *`** : supporté en D1 via `first()` après `INSERT`.
4. **Transactions** : `DB.batch([stmt1, stmt2])` pour atomicité multi-statements.
5. **Pas de JSON natif** : stocker en `TEXT` et parser côté application (ex: `additional_sirets`).

## Monitoring des requêtes

Le `index.ts` patche `env.DB.prepare` pour compter les requêtes D1 par appel HTTP :

```typescript
// Logging structuré : { d1RequestCount: N, durationMs: T }
```

Seuil : > 10 requêtes D1 par appel HTTP = signal d'optimisation nécessaire.

## Conséquences

**Positives :**
- Latence sub-5ms pour les requêtes simples (binding natif).
- Pas de connexion TCP à gérer (pas de pool, pas de timeout).
- SQLite mature : syntaxe bien documentée, facile à tester localement.
- `wrangler d1 execute --local` pour développement sans cloud.

**Négatives / Contraintes :**
- **SQLite single-writer** : pas de transactions distribuées entre Workers.
- **Pas de triggers** : la logique post-write doit être gérée applicativement.
- **Limite free tier** : 5M reads/jour, 100K writes/jour.
- **Pas de `pg_vector`** : recherche géographique implémentée avec Haversine en application.

## Plan de migration (si nécessaire)

À 50K writes/jour, évaluer **Turso** (libsql) :
- Compatible SQLite → migration des schémas sans réécriture
- Réplication multi-régions
- Coût ~$29/mois pour usage intensif
