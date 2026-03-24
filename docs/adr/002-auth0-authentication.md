# ADR-002 — Auth0 pour l'authentification et l'autorisation

**Date** : 2024-01
**Statut** : Accepté
**Décideurs** : Ronan LE MEILLAT

---

## Contexte

KduFoot nécessite :
- Authentification utilisateur (email/password, social login)
- Autorisation fine par permissions (`read:api`, `write:api`, `admin:api`)
- Gestion des comptes sans code serveur d'auth (trop risqué à maintenir)
- Support PWA / mobile (token refresh, offline)

Alternatives évaluées :
- **Auth0** (IDaaS géré)
- **Keycloak** (self-hosted)
- **Better Auth** (self-hosted, Node.js)
- **Supabase Auth** (géré)
- **NextAuth / Auth.js** (self-hosted)

## Décision

Utiliser **Auth0** pour l'authentification et la gestion des permissions, avec :
- OIDC/JWT pour les tokens d'accès (RS256)
- RBAC Auth0 pour les permissions stockées dans les claims JWT
- Auth0 Management API pour synchroniser les utilisateurs
- `jose` library pour la vérification JWT côté Worker (sans SDK lourd)

## Justification

| Critère | Auth0 | Keycloak | Better Auth | Supabase Auth |
|---|---|---|---|---|
| Maintenance | Aucune | Haute | Moyenne | Faible |
| Coût (< 7.5K MAU) | Gratuit | Infra (~$5+) | Infra | Gratuit |
| Compatible Workers | Oui (JWT verify) | Oui | Non (Node.js) | Oui |
| RBAC/permissions | Natif | Natif | Limité | Limité |
| Social login | Multi-provider | Multi-provider | Limité | Limité |
| Compliance RGPD | Certifié | Manuel | Manuel | Certifié |

Auth0 free tier couvre 7.5K MAU — largement suffisant pour le démarrage.

## Implémentation

```
Client (React)
  └─ @auth0/auth0-react → getAccessTokenSilently() → JWT
       │
Worker (Cloudflare)
  └─ Authorization: Bearer <JWT>
       └─ jose.createRemoteJWKSet(AUTH0_DOMAIN/.well-known/jwks.json)
            └─ jwtVerify(token, JWKS, { issuer, audience, algorithms: ['RS256'] })
                 └─ payload.permissions → checkPermissions()
```

Les permissions sont stockées dans le claim `permissions` du JWT (via Auth0 RBAC).
Le `sub` Auth0 sert d'identifiant stable pour lier les utilisateurs à la base D1.

## Conséquences

**Positives :**
- Zéro code d'authentification à maintenir.
- Rotation automatique des clés JWKS.
- MFA, brute-force protection, anomaly detection inclus.
- Dashboard de gestion des utilisateurs et permissions.

**Négatives / Contraintes :**
- **Lock-in** : migration vers une autre solution nécessiterait de ré-émettre tous les tokens.
- **Limite 7.5K MAU** sur le free tier → migration à planifier à ~15K MAU (voir [ADR-001 scaling](001-cloudflare-edge-architecture.md)).
- **Latence JWKS** : première vérification JWT nécessite un fetch JWKS (~50ms) ; mis en cache ensuite par `jose`.
- **Management API** : rate-limited, utilisé uniquement pour l'assignation initiale de permissions.

## Plan de migration (si nécessaire)

À 17.5K MAU, évaluer **Better Auth** (self-hosted sur un Worker ou un VPS léger) pour :
- Supprimer la dépendance externe
- Contrôle total des données utilisateurs
- Coût ~$0 en infra Workers
