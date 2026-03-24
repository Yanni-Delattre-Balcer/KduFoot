# ADR-007 — Rate Limiting distribué via KV Store

**Date** : 2026-01
**Statut** : Accepté
**Décideurs** : Équipe KduFoot

## Contexte

Le rate limiting in-memory (Map) ne fonctionne pas sur Cloudflare Workers car chaque requête peut être traitée par un isolat différent. Un rate limiter local ne protège que l'isolat courant.

## Décision

Double couche de rate limiting :
1. **Cloudflare Rate Limiter** natif (première ligne de défense)
2. **KV Store** pour le rate limiting applicatif strict (blocage utilisateur, invalidation de cache)

Le cache de blocage utilisateur est stocké dans KV avec TTL, et invalidé via `invalidateBlockCache(auth0Sub, env)`.

## Conséquences

- Protection distribuée sur tous les edge nodes Cloudflare
- Le cache de blocage est cohérent globalement (KV est eventually consistent, ~60s)
- Pas de mémoire partagée nécessaire entre isolats
- `invalidateBlockCache` prend désormais 2 paramètres (sub + env) pour accéder au KV
