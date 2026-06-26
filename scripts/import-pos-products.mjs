/**
 * Import catalogue POS depuis Excel (Produits POS Natus).
 *
 * Usage :
 *   npm run import:products
 *   node scripts/import-pos-products.mjs [chemin.xlsx]
 */
import { existsSync } from "fs";
import { resolve } from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PRODUCT_BRAND = "Natus";
const DEFAULT_XLSX = resolve(process.cwd(), "scripts/data/produits-pos-natus.xlsx");
const BATCH_SIZE = 50;

const CATEGORY_MAP = {
  ACCUEL: "Nettoyage",
  BODY: "Corps",
  COFFRETS: "Accessoires",
  FACE: "Soin visage",
  HAIR: "Cheveux",
  HAMMAM: "Nettoyage",
  HOME: "Parfum",
  KIDS: "Corps",
  MEN: "Corps",
  SUN: "Corps",
  TRAVEL: "Accessoires",
};

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

function defaultImageUrl(supabaseUrl, category) {
  const file = CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES.Corps;
  const bucket = getCategoryBucketSlug(category);
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${file}`;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugBarcode(text) {
  return normalizeText(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toUpperCase();
}

function parsePrice(value) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function buildProductName(row) {
  const name = normalizeText(row.Produit);
  const size = normalizeText(row.Contenance);
  if (!size) return name;
  if (name.toLowerCase().includes(size.toLowerCase())) return name;
  return `${name} (${size})`;
}

function mapCategory(raw) {
  const key = normalizeText(raw).toUpperCase();
  return CATEGORY_MAP[key] || "Corps";
}

function readRows(filePath) {
  if (!existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  return { sheetName, rows };
}

function toProductRows(rows, supabaseUrl) {
  const usedBarcodes = new Set();
  const products = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = buildProductName(row);
    if (!name) continue;

    let barcode = normalizeText(row.__EMPTY);
    if (!barcode) {
      barcode = `NAT-${slugBarcode(`${name}-${row.Contenance || i}`)}`;
    }

    let uniqueBarcode = barcode;
    let suffix = 2;
    while (usedBarcodes.has(uniqueBarcode)) {
      uniqueBarcode = `${barcode}-${suffix}`;
      suffix += 1;
    }
    usedBarcodes.add(uniqueBarcode);

    const category = mapCategory(row["Catégorie"]);
    const price = parsePrice(row["Prix de vente"]);
    if (price == null) {
      console.warn(`⚠️  Ligne ${i + 2} ignorée (prix invalide) : ${name}`);
      continue;
    }

    const image = normalizeText(row.Image);
    const imageUrl = image || defaultImageUrl(supabaseUrl, category);

    products.push({
      name,
      barcode: uniqueBarcode,
      description: normalizeText(row.Contenance) || null,
      price,
      stock: 0,
      category,
      categories: [category],
      product_kind: "simple",
      brand: PRODUCT_BRAND,
      image_url: imageUrl,
    });
  }

  return products;
}

async function fetchExistingBarcodes(supabase) {
  const barcodes = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("barcode")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      if (row.barcode) barcodes.add(row.barcode);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return barcodes;
}

async function main() {
  const filePath = resolve(process.argv.find((a) => a.endsWith(".xlsx")) || DEFAULT_XLSX);
  const dryRun = process.argv.includes("--dry-run");

  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { sheetName, rows } = readRows(filePath);
  const products = toProductRows(rows, supabaseUrl);

  console.log(`\n▶ Import produits POS`);
  console.log(`   Fichier  : ${filePath}`);
  console.log(`   Feuille  : ${sheetName}`);
  console.log(`   Lignes   : ${rows.length}`);
  console.log(`   Produits : ${products.length}`);
  if (dryRun) console.log(`   Mode     : dry-run (aucune écriture)\n`);
  else console.log("");

  if (dryRun) {
    console.log(JSON.stringify(products.slice(0, 3), null, 2));
    return;
  }

  const existingBarcodes = await fetchExistingBarcodes(supabase);
  const toInsert = products.filter((p) => !existingBarcodes.has(p.barcode));
  const toUpdate = products.filter((p) => existingBarcodes.has(p.barcode));

  console.log(`   Nouveaux : ${toInsert.length}`);
  console.log(`   Mises à jour : ${toUpdate.length}\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from("products").insert(batch).select("id, barcode");

    if (error) {
      console.error(`❌ Insert batch ${i / BATCH_SIZE + 1}:`, error.message);
      errors += batch.length;
      continue;
    }

    inserted += data?.length || 0;
    process.stdout.write(`\r   Insérés : ${inserted}/${toInsert.length}`);
  }
  console.log("");

  for (const product of toUpdate) {
    const { error } = await supabase
      .from("products")
      .update({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        categories: product.categories,
        image_url: product.image_url,
        brand: product.brand,
      })
      .eq("barcode", product.barcode);

    if (error) {
      console.error(`❌ Update ${product.barcode}:`, error.message);
      errors += 1;
    } else {
      updated += 1;
    }
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true);

  if (storesError) {
    console.error("❌ Magasins:", storesError.message);
  } else if (stores?.length && toInsert.length) {
    const { data: insertedProducts } = await supabase
      .from("products")
      .select("id, barcode")
      .in(
        "barcode",
        toInsert.map((p) => p.barcode)
      );

    const inventoryRows = [];
    for (const product of insertedProducts || []) {
      for (const store of stores) {
        inventoryRows.push({
          store_id: store.id,
          product_id: product.id,
          stock: 0,
        });
      }
    }

    for (let i = 0; i < inventoryRows.length; i += 500) {
      const chunk = inventoryRows.slice(i, i + 500);
      const { error: invError } = await supabase
        .from("store_inventory")
        .upsert(chunk, { onConflict: "store_id,product_id", ignoreDuplicates: true });
      if (invError) {
        console.error("❌ store_inventory:", invError.message);
        break;
      }
    }

    console.log(`   Inventaire magasin : ${inventoryRows.length} lignes (stock 0)`);
  }

  console.log(`\n✅ Terminé — ${inserted} créés, ${updated} mis à jour, ${errors} erreurs\n`);
}

main().catch((err) => {
  console.error("\n❌", err.message || err);
  process.exit(1);
});
