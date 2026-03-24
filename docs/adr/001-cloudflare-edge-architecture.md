# ADR-001 — Cloudflare Workers comme runtime backend

**Date** : 2024-01
**Statut** : Accepté
**Décideurs** : Ronan LE MEILLAT

---

## Contexte

KduFoot est une plateforme pour joueurs de football amateur en France. Le trafic est imprévisible (pics autour des week-ends), la latence doit rester faible pour une bonne UX mobile, et le budget d'infrastructure doit rester minimal au démarrage.

Il fallait choisir entre :
- Un serveur Node.js traditionnel (VPS, Fly.io, Railway)
- Un runtime serverless (AWS Lambda, Vercel Functions)
- Cloudflare Workers (edge computing)

## Décision

Utiliser **Cloudflare Workers** comme runtime backend, avec :
- **D1** pour la base de données SQL
- **KV** pour le cache distribué
- **Durable Objects** pour les WebSockets (WebSocketHub)
- **Cloudflare Pages** pour le frontend statique

## Justification

| Critère | VPS Node.js | Serverless (Lambda) | Cloudflare Workers |
|---|---|---|---|
| Latence | ~50-100ms (1 région) | ~50ms (cold start) | ~5-20ms (edge mondial) |
| Coût démarrage | ~$5-20/mois | $0 (free tier) | $0 (free tier) |
| Scaling | Manuel | Automatique | Automatique |
| Complexité infra | Haute | Moyenne | Faible |
| Cold start | N/A | ~200-500ms | ~0ms (V8 isolates) |

Avantages clés :
- **Zero cold start** : les isolates V8 démarrent en ~0ms vs ~200ms pour Lambda.
- **Edge global** : requêtes traitées dans le datacenter le plus proche de l'utilisateur.
- **Free tier généreux** : 100K req/jour gratuit, puis $0.50/M req.
- **Écosystème intégré** : D1, KV, R2, Durable Objects = moins de vendors.
- **Déploiement atomique** : `wrangler deploy` = déploiement mondial en ~30 secondes.

## Conséquences

**Positives :**
- Latence excellente pour les utilisateurs français (datacenter Paris/Amsterdam).
- Pas de gestion serveur, de certificats SSL, ni de scaling manuel.
- Monitoring intégré via Cloudflare Dashboard + Workers Logs.

**Négatives / Contraintes :**
- **Limite CPU** : 10ms CPU time par requête sur le free tier (50ms sur Paid).
- **Pas de filesystem** : tout I/O passe par D1/KV/R2.
- **Compatibilité Node.js partielle** : certains packages npm ne fonctionnent pas (ex: modules natifs).
- **SQLite D1** : pas de transactions distribuées, pas de `RETURNING *` sur tous les drivers.
- **Environnement sandboxé** : `fetch()` uniquement (pas de `net`, `fs`, `child_process`).

## Alternatives rejetées

- **Railway / Fly.io** : coût plus élevé à l'échelle, latence moins bonne hors France.
- **AWS Lambda** : cold starts, complexité IAM, coût d'egress réseau.
- **Vercel Edge Functions** : moins de contrôle, pas de WebSocket natif.
