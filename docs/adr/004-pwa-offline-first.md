# ADR-004 — Progressive Web App avec stratégie Offline-First

**Date** : 2025-06
**Statut** : Accepté
**Décideurs** : Équipe KduFoot

## Contexte

Les utilisateurs accèdent à KduFoot depuis des terrains de football avec une connectivité réseau variable. L'application doit rester utilisable même en mode dégradé.

## Décision

Adopter Vite PWA (vite-plugin-pwa) avec Workbox pour :
- **Precaching** de l'app shell (index.html, JS, CSS, assets)
- **Runtime caching** : CacheFirst pour les fonts Google, NetworkFirst pour les exercices, NetworkOnly pour Auth0 et les API
- **Service Worker** avec `skipWaiting` + `clientsClaim` pour les mises à jour automatiques
- **NavigateFallback** vers index.html pour le SPA routing offline
- **Denylist** : `/api/`, `/_auth0/`, paramètres OAuth (`code=`, `state=`, `error=`)

## Conséquences

- Les utilisateurs peuvent consulter les exercices et l'app shell hors ligne
- Les requêtes Auth0 ne sont jamais cachées (sécurité)
- Le manifest permet l'installation sur l'écran d'accueil (Android/iOS)
- Le stockage persistant (`navigator.storage.persist()`) empêche le nettoyage automatique par le navigateur
