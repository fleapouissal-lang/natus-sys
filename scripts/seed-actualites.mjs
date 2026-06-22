/**
 * Exemples d'actualités internes (journal Natus).
 *
 * Usage : npm run seed:actualites
 * Prérequis : npm run db:migrate && npm run seed:users
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1560066984-138d9834dfe3?w=1200&q=80",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80",
];

async function findProfileId(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function findStoreId(supabase, namePart) {
  const { data } = await supabase
    .from("stores")
    .select("id, name, city")
    .ilike("name", `%${namePart}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function upsertAnnouncement(supabase, row, images = []) {
  const { data: existing } = await supabase
    .from("news_announcements")
    .select("id")
    .eq("title", row.title)
    .maybeSingle();

  let announcementId = existing?.id;

  if (announcementId) {
    await supabase.from("news_announcements").update(row).eq("id", announcementId);
    await supabase
      .from("news_announcement_images")
      .delete()
      .eq("announcement_id", announcementId);
  } else {
    const { data, error } = await supabase
      .from("news_announcements")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    announcementId = data.id;
  }

  if (images.length) {
    const { error: imgError } = await supabase.from("news_announcement_images").insert(
      images.map((image_url, sort_order) => ({
        announcement_id: announcementId,
        image_url,
        sort_order,
      }))
    );
    if (imgError) throw imgError;
  }

  return announcementId;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const directorId = await findProfileId(supabase, "directeur@natus.ma");
  const managerId = await findProfileId(supabase, "manager@natus.ma");
  const gueliz = await findStoreId(supabase, "Guéliz");

  if (!directorId) {
    console.error("Profil directeur@natus.ma introuvable — lancez npm run seed:users");
    process.exit(1);
  }

  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  const samples = [
    {
      row: {
        title: "Bienvenue sur le journal Natus",
        body:
          "Ce fil d'actualités centralise les annonces internes : procédures, événements, rappels stock et messages de la direction.\n\nConsultez-le régulièrement depuis votre espace caisse, hub ou gestion.",
        audience_type: "all",
        target_city: null,
        target_store_id: null,
        target_roles: null,
        is_pinned: true,
        published_at: daysAgo(2),
        created_by: directorId,
      },
      images: [SAMPLE_IMAGES[0]],
    },
    {
      row: {
        title: "Réunion gérants Marrakech — jeudi 10h",
        body:
          "Chers gérants,\n\nPoint hebdomadaire jeudi à 10h au siège Guéliz : objectifs ventes, retours clients et préparation rentrée.\n\nMerci de confirmer votre présence.",
        audience_type: "managers_city",
        target_city: "Marrakech",
        target_store_id: null,
        target_roles: null,
        is_pinned: false,
        published_at: daysAgo(1),
        created_by: directorId,
      },
      images: [],
    },
    {
      row: {
        title: "Nouveau protocole caisse — scan fidélité",
        body:
          "À partir de lundi, scannez systématiquement la carte fidélité avant encaissement pour créditer les points.\n\nEn cas de problème technique, contactez votre gérant.",
        audience_type: "cashiers_city",
        target_city: "Marrakech",
        target_store_id: null,
        target_roles: null,
        is_pinned: false,
        published_at: daysAgo(0),
        created_by: managerId ?? directorId,
      },
      images: [SAMPLE_IMAGES[1], SAMPLE_IMAGES[2]],
    },
    {
      row: {
        title: "Inventaire hub Marrakech — samedi matin",
        body:
          "Inventaire trimestriel de l'entrepôt hub samedi 8h–12h.\n\nPrévoir équipe renforcée et accès véhicules de livraison bloqués le matin.",
        audience_type: "hub_city",
        target_city: "Marrakech",
        target_store_id: null,
        target_roles: null,
        is_pinned: false,
        published_at: daysAgo(0),
        created_by: directorId,
      },
      images: [],
    },
  ];

  if (gueliz?.id) {
    samples.push({
      row: {
        title: `Info magasin ${gueliz.name}`,
        body:
          "Rappel : fermeture exceptionnelle mardi après-midi pour maintenance climatisation.\n\nRéouverture mercredi 10h. Merci de prévenir les clients en caisse.",
        audience_type: "store",
        target_city: gueliz.city,
        target_store_id: gueliz.id,
        target_roles: null,
        is_pinned: false,
        published_at: daysAgo(0),
        created_by: managerId ?? directorId,
      },
      images: [SAMPLE_IMAGES[0]],
    });
  }

  for (const sample of samples) {
    const id = await upsertAnnouncement(supabase, sample.row, sample.images);
    console.log(`✓ ${sample.row.title} (${id})`);
  }

  console.log("\nSeed actualités terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
