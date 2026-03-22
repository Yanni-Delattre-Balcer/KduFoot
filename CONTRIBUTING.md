# Contribuer à KduFoot

Bienvenue sur le projet KduFoot ! Voici les directives pour assurer le maintien du plus haut niveau de qualité (100/100) lors des audits de code.

## Conventions de Code
- **TypeScript strict** : L'utilisation de `any` est strictement interdite. Si le type n'est pas connu, utiliser `unknown` ou une interface spécifique.
- Les types transverses doivent être définis et centralisés dans `apps/cloudflare-worker/src/types/index.ts`.
- **Fichiers Modulaires** : Ne pas dépasser 300 lignes pour un contrôleur. Si ce seuil est dépassé, découper en sous-modules thématiques.

## Tests et Intégration Continue
- Le backend utilise **Vitest** pour ses tests unitaires et d'intégration (`__tests__/`).
- **Seuil de couverture minimal** : Bloqué à 70% dans `vitest.config.mts`.
- Chaque PR modifiant un comportement doit inclure/mettre à jour les tests associés. Pour lancer la suite :
  `npm run test -- --coverage`

## Sécurité & API
- Ne jamais retourner les détails d'exécution (comme `e.message`) aux utilisateurs dans les routes REST. Utiliser des messages de status HTTP adéquats (403, 404, 500).
- Toujours encapsuler les routes avec les middlewares de vérification Auth0 si elles exposent des ressources sensibles.

## Accessibilité & UX
- Les labels ARIA (`aria-label`) sont obligatoires sur les éléments interactifs sans texte (icon-only).
- Vérifier le fonctionnement des "focus-traps" dans chaque modal pour la navigabilité clavier.
- Les contrastes doivent toujours respecter la norme WCAG AA (notamment les tons violets sur fonds sombres/clairs).

Merci de contribuer à faire de KduFoot une plateforme irréprochable !
