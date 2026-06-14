import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, "../assets/products");

const PRODUCT_CATEGORIES = [
  "Soin visage",
  "Maquillage",
  "Nettoyage",
  "Parfum",
  "Corps",
  "Cheveux",
  "Accessoires",
];

const CATEGORY_DEFAULT_IMAGES = {
  "Soin visage": "mille-vertus.png",
  Maquillage: "mille-vertus.png",
  Nettoyage: "mille-vertus.png",
  Parfum: "huile-precieuse.png",
  Corps: "huile-precieuse.png",
  Cheveux: "huile-precieuse.png",
  Accessoires: "mille-vertus.png",
};

function getCategoryBucketSlug(category) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getProductImagePublicUrl(supabaseUrl, category, fileName) {
  const bucket = getCategoryBucketSlug(category);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
}

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }

  return env;
}

async function ensureBucket(supabase, bucketId) {
  const { data: existing } = await supabase.storage.getBucket(bucketId);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (error && !error.message.includes("already exists")) {
    throw error;
  }
}

async function uploadFile(supabase, bucket, objectPath, localFile) {
  const buffer = readFileSync(localFile);
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("📦 Upload images produits Natus → Supabase Storage\n");

  const uploadedByCategory = {};

  for (const category of PRODUCT_CATEGORIES) {
    const bucket = getCategoryBucketSlug(category);
    const objectName = CATEGORY_DEFAULT_IMAGES[category];
    const sourceFile = resolve(
      ASSETS_DIR,
      objectName.includes("huile") ? "huile-precieuse.png" : "mille-vertus.png"
    );

    await ensureBucket(supabase, bucket);
    await uploadFile(supabase, bucket, objectName, sourceFile);

    const publicUrl = getProductImagePublicUrl(url, category, objectName);
    uploadedByCategory[category] = publicUrl;
    console.log(`✓  ${category} → bucket "${bucket}/${objectName}"`);
  }

  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select("id, name, category");

  if (fetchError) {
    console.error("❌ Lecture produits :", fetchError.message);
    process.exit(1);
  }

  console.log(`\n🔄 Mise à jour de ${products?.length || 0} produit(s)...\n`);

  for (const product of products || []) {
    const category = product.category || "Soin visage";
    const imageUrl =
      uploadedByCategory[category] ||
      getProductImagePublicUrl(url, category, CATEGORY_DEFAULT_IMAGES["Soin visage"]);

    const { error } = await supabase
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", product.id);

    if (error) {
      console.error(`❌ ${product.name} : ${error.message}`);
      continue;
    }

    console.log(`✓  ${product.name} → ${imageUrl}`);
  }

  console.log("\n✅ Terminé — images stockées par catégorie dans Supabase Storage");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
