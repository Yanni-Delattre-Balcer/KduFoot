# ADR-005 — Authentification et permissions scopées à la Request

**Date** : 2025-12
**Statut** : Accepté
**Décideurs** : Équipe KduFoot

## Contexte

Cloudflare Workers partagent un même runtime entre toutes les requêtes. Attacher l'utilisateur authentifié et ses permissions à l'instance du Router créerait des fuites d'état entre requêtes concurrentes.

## Décision

Attacher `user` (JWTPayload) et `permissions` (string[]) directement sur l'objet `Request` via le type `AuthenticatedRequest`, après vérification JWT dans le middleware du router.

```typescript
export type AuthenticatedRequest = Request & {
    params: Record<string, string>;
    user?: JWTPayload;
    permissions: string[];
};
```

## Conséquences

- Isolation complète entre requêtes concurrentes
- Pas de mutation d'état partagé — chaque requête porte son propre contexte
- Les routes accèdent aux permissions via `(request as AuthenticatedRequest).permissions`
- Compatible avec le modèle serverless stateless de Cloudflare Workers
