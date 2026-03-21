/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Remplacez par votre email administrateur sécurisé
  const SUPER_ADMIN_EMAIL = "yannidelattrebalcer.artois@gmail.com";

  if (event.user.email === SUPER_ADMIN_EMAIL) {
    // Injecte une permission spéciale directement dans l'Access Token
    api.accessToken.setCustomClaim("permissions", ["admin:users", "admin:exercises", "admin:matches", "admin:analytics", "admin:billing", "auth0:admin:api"]);
    
    // Injecte un tag dans le token d'identité (utile pour le frontend React)
    api.idToken.setCustomClaim("https://kdufoot.com/roles", ["admin"]);
  }
};
