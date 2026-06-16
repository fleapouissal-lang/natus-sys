/** Délai d'inactivité avant déconnexion automatique (15 min). */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** Clé localStorage partagée entre onglets pour la dernière activité. */
export const SESSION_LAST_ACTIVITY_KEY = "natus-last-activity";

/** Intervalle minimum entre deux mises à jour d'activité. */
export const SESSION_ACTIVITY_THROTTLE_MS = 30 * 1000;

/** Fréquence de vérification de l'inactivité. */
export const SESSION_IDLE_CHECK_MS = 60 * 1000;
