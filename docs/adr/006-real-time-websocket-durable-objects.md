# ADR-006 — WebSocket temps réel via Durable Objects

**Date** : 2025-12
**Statut** : Accepté
**Décideurs** : Équipe KduFoot

## Contexte

L'application nécessite des notifications en temps réel (nouveaux matchs, contacts, mises à jour) sans polling coûteux.

## Décision

Utiliser les Durable Objects de Cloudflare pour un hub WebSocket (`WebSocketHub`) :
- Un Durable Object unique gère toutes les connexions WebSocket actives
- Les Workers envoient des événements via `ctx.waitUntil(broadcastDataChanged(env))` (non-bloquant)
- Le client utilise un hook `useWebSocket` avec reconnexion automatique
- Les messages sont sérialisés en JSON avec un type d'événement

## Conséquences

- Notifications push instantanées sans polling
- `ctx.waitUntil` garantit que le broadcast n'impacte pas la latence de la réponse HTTP
- Scalabilité : les Durable Objects gèrent la distribution automatiquement
- Coût minimal : une seule instance Durable Object par namespace
