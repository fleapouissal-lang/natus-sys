/** Emails caisse courts — un compte POS par magasin retail. */
export const STORE_CAISSE_EMAILS = {
  "Natus Rabat": "caisse.rabat@natus.ma",
  "Natus Triangle d'or Casablanca": "caisse.casablanca@natus.ma",
  "Natus Gueliz Marrakech": "caisse.gueliz@natus.ma",
  "Natus Socco Alto Tanger": "caisse.tanger@natus.ma",
  "Natus Medina Mall": "caisse.medina@natus.ma",
  "Natus Sidi Ghanem": "caisse.sidi-ghanem@natus.ma",
};

/** Anciens emails auto-générés (slug complet) — pour migration si besoin. */
export const LEGACY_CAISSE_EMAILS = {
  "Natus Rabat": "caisse.natus.rabat@natus.ma",
  "Natus Triangle d'or Casablanca": "caisse.natus.triangle.d.or.casablanca@natus.ma",
  "Natus Gueliz Marrakech": "caisse.natus.gueliz.marrakech@natus.ma",
  "Natus Socco Alto Tanger": "caisse.natus.socco.alto.tanger@natus.ma",
  "Natus Medina Mall": "caisse.natus.medina.mall@natus.ma",
  "Natus Sidi Ghanem": "caisse.natus.sidi.ghanem@natus.ma",
};

export function caisseEmailForStore(storeName) {
  const email = STORE_CAISSE_EMAILS[storeName];
  if (email) return email;

  const slug = storeName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `caisse.${slug}@natus.ma`;
}
