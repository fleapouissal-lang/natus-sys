/**
 * Import / mise à jour catalogue POS depuis Excel (Produits POS Update 2.0).
 *
 * Règles :
 * - Code COM ou code-barres absent dans le fichier → laissé vide (null)
 * - Prix de vente absent → 0
 *
 * Usage :
 *   npm run import:products
 *   npm run import:products -- --replace-all
 *   node scripts/import-pos-products.mjs [chemin.xlsx] [--replace-all] [--dry-run]
 */
import { existsSync } from "fs";
import { resolve } from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const PRODUCT_BRAND = "Natus";
const DEFAULT_XLSX = resolve(process.cwd(), "scripts/data/produits-pos-update-2.0.xlsx");
const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";
const BATCH_SIZE = 50;

/** Codes Excel → libellés catalogue (voir lib/constants/products.ts) */
const EXCEL_CATEGORY_MAP = {
  ACCUEL: "Accueil",
  ACCUEIL: "Accueil",
  BODY: "Corps",
  COFFRETS: "Coffrets",
  FACE: "Visage",
  HAIR: "Cheveux",
  HAMMAM: "Hammam",
  HOME: "Maison",
  KIDS: "Enfants",
  MEN: "Homme",
  SUN: "Soleil",
  TRAVEL: "Voyage",
};

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value) {
  if (value === "" || value == null) return null;
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
  return EXCEL_CATEGORY_MAP[key] || "Corps";
}

function buildDescription(row) {
  const parts = [
    normalizeText(row.Contenance),
    normalizeText(row["Type / Classification"]),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function resolveImageUrl(raw) {
  const image = normalizeText(raw);
  if (!image) return PRODUCT_PLACEHOLDER;
  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("//")) {
    return image.startsWith("//") ? `https:${image}` : image;
  }
  return image.startsWith("/") ? image : `https://${image}`;
}

function readRows(filePath) {
  if (!existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes("produits")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  return { sheetName, rows };
}

function toProductRows(rows) {
  const usedCodes = new Set();
  const usedBarcodes = new Set();
  const products = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = buildProductName(row);
    if (!name) continue;

    let productCode = normalizeText(row.Code) || null;
    if (productCode) {
      let uniqueCode = productCode;
      let codeSuffix = 2;
      while (usedCodes.has(uniqueCode)) {
        console.warn(
          `⚠️  Ligne ${i + 2} : code COM dupliqué « ${productCode} » → « ${productCode}-${codeSuffix} »`
        );
        uniqueCode = `${productCode}-${codeSuffix}`;
        codeSuffix += 1;
      }
      usedCodes.add(uniqueCode);
      productCode = uniqueCode;
    }

    let barcode = normalizeText(row.Barcode) || null;
    if (barcode) {
      let uniqueBarcode = barcode;
      let barcodeSuffix = 2;
      while (usedBarcodes.has(uniqueBarcode)) {
        console.warn(
          `⚠️  Ligne ${i + 2} : code-barres dupliqué « ${barcode} » → « ${barcode}-${barcodeSuffix} »`
        );
        uniqueBarcode = `${barcode}-${barcodeSuffix}`;
        barcodeSuffix += 1;
      }
      usedBarcodes.add(uniqueBarcode);
      barcode = uniqueBarcode;
    }

    const salePrice = parsePrice(row["Prix de vente (MAD)"]);
    const strikePrice = parsePrice(row["Prix barré (MAD)"]);
    const price = salePrice ?? 0;
    let compareAtPrice = strikePrice;
    if (compareAtPrice != null && compareAtPrice <= price) {
      compareAtPrice = null;
    }

    const category = mapCategory(row["Catégorie"]);
    const classification = normalizeText(row["Type / Classification"]) || null;

    products.push({
      product_code: productCode,
      name,
      barcode,
      description: buildDescription(row),
      price,
      compare_at_price: compareAtPrice,
      category,
      categories: [category],
      classification,
      product_kind: "simple",
      brand: PRODUCT_BRAND,
      image_url: resolveImageUrl(row.Image),
    });
  }

  return products;
}

async function fetchExistingProducts(supabase) {
  const products = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, product_code, barcode, product_kind")
      .eq("product_kind", "simple")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;
    products.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return products;
}

function buildLookup(existing) {
  const byCode = new Map();
  const byBarcode = new Map();
  const byName = new Map();

  for (const product of existing) {
    if (product.product_code) byCode.set(product.product_code, product);
    if (product.barcode) byBarcode.set(product.barcode, product);
    byName.set(product.name, product);
  }

  return { byCode, byBarcode, byName };
}

function findExisting(lookup, row) {
  if (row.product_code && lookup.byCode.has(row.product_code)) {
    return lookup.byCode.get(row.product_code);
  }
  if (row.barcode && lookup.byBarcode.has(row.barcode)) {
    return lookup.byBarcode.get(row.barcode);
  }
  if (lookup.byName.has(row.name)) {
    return lookup.byName.get(row.name);
  }
  return null;
}

function toUpdatePayload(row) {
  return {
    product_code: row.product_code,
    name: row.name,
    barcode: row.barcode,
    description: row.description,
    price: row.price,
    compare_at_price: row.compare_at_price,
    category: row.category,
    categories: row.categories,
    classification: row.classification,
    brand: row.brand,
    image_url: row.image_url,
  };
}

function toInsertPayload(row) {
  return {
    ...toUpdatePayload(row),
    stock: 0,
    product_kind: "simple",
  };
}

async function resetCatalog(supabase) {
  const { error } = await supabase.rpc("reset_product_catalog");
  if (error) throw new Error(`reset_product_catalog: ${error.message}`);
}

async function initStoreInventory(supabase, productIds) {
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true);

  if (storesError) throw new Error(storesError.message);
  if (!stores?.length || !productIds.length) return 0;

  const inventoryRows = [];
  for (const productId of productIds) {
    for (const store of stores) {
      inventoryRows.push({
        store_id: store.id,
        product_id: productId,
        stock: 0,
      });
    }
  }

  for (let i = 0; i < inventoryRows.length; i += 500) {
    const chunk = inventoryRows.slice(i, i + 500);
    const { error: invError } = await supabase
      .from("store_inventory")
      .upsert(chunk, { onConflict: "store_id,product_id", ignoreDuplicates: true });
    if (invError) throw new Error(invError.message);
  }

  return inventoryRows.length;
}

async function syncProducts(supabase, products) {
  const existing = await fetchExistingProducts(supabase);
  const lookup = buildLookup(existing);

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const insertedIds = [];

  for (const row of products) {
    const match = findExisting(lookup, row);

    if (match) {
      const { error } = await supabase
        .from("products")
        .update(toUpdatePayload(row))
        .eq("id", match.id);

      if (error) {
        console.error(`❌ Update ${row.name}:`, error.message);
        errors += 1;
      } else {
        updated += 1;
        if (row.product_code) lookup.byCode.set(row.product_code, match);
        if (row.barcode) lookup.byBarcode.set(row.barcode, match);
        lookup.byName.set(row.name, match);
      }
      continue;
    }

    const { data, error } = await supabase
      .from("products")
      .insert(toInsertPayload(row))
      .select("id")
      .single();

    if (error || !data) {
      console.error(`❌ Insert ${row.name}:`, error?.message || "Erreur");
      errors += 1;
      continue;
    }

    inserted += 1;
    insertedIds.push(data.id);
    const created = { id: data.id, ...row };
    if (row.product_code) lookup.byCode.set(row.product_code, created);
    if (row.barcode) lookup.byBarcode.set(row.barcode, created);
    lookup.byName.set(row.name, created);
  }

  return { inserted, updated, errors, insertedIds };
}

async function insertAllProducts(supabase, products) {
  let inserted = 0;
  let errors = 0;
  const insertedIds = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE).map(toInsertPayload);
    const { data, error } = await supabase.from("products").insert(batch).select("id");

    if (error) {
      console.error(`❌ Insert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      errors += batch.length;
      continue;
    }

    inserted += data?.length || 0;
    for (const row of data || []) insertedIds.push(row.id);
    process.stdout.write(`\r   Insérés : ${inserted}/${products.length}`);
  }
  console.log("");

  return { inserted, updated: 0, errors, insertedIds };
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = resolve(args.find((a) => a.endsWith(".xlsx")) || DEFAULT_XLSX);
  const dryRun = args.includes("--dry-run");
  const replaceAll = args.includes("--replace-all");

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
  const products = toProductRows(rows);

  const withCode = products.filter((p) => p.product_code).length;
  const withBarcode = products.filter((p) => p.barcode).length;
  const withPrice = products.filter((p) => p.price > 0).length;
  const withImage = products.filter((p) => p.image_url !== PRODUCT_PLACEHOLDER).length;

  console.log(`\n▶ Import produits POS`);
  console.log(`   Fichier  : ${filePath}`);
  console.log(`   Feuille  : ${sheetName}`);
  console.log(`   Lignes   : ${rows.length}`);
  console.log(`   Produits : ${products.length}`);
  console.log(`   Mode     : ${replaceAll ? "remplacement total" : "mise à jour (sync)"}`);
  if (dryRun) console.log(`   Dry-run  : oui\n`);
  else console.log("");

  if (dryRun) {
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
    console.log(`\n   Code COM renseigné : ${withCode}/${products.length}`);
    console.log(`   Code-barres        : ${withBarcode}/${products.length}`);
    console.log(`   Prix > 0           : ${withPrice}/${products.length}`);
    return;
  }

  if (replaceAll) {
    console.log("   Suppression du catalogue existant…");
    await resetCatalog(supabase);
  }

  const result = replaceAll
    ? await insertAllProducts(supabase, products)
    : await syncProducts(supabase, products);

  const inventoryLines = await initStoreInventory(supabase, result.insertedIds);
  if (inventoryLines) {
    console.log(`   Inventaire magasin (nouveaux) : ${inventoryLines} lignes`);
  }

  console.log(`   Code COM renseigné : ${withCode}/${products.length}`);
  console.log(`   Code-barres        : ${withBarcode}/${products.length}`);
  console.log(`   Prix > 0           : ${withPrice}/${products.length}`);
  console.log(`   Avec image URL     : ${withImage}/${products.length}`);
  console.log(
    `\n✅ Terminé — ${result.inserted} créés, ${result.updated} mis à jour, ${result.errors} erreurs\n`
  );
}

main().catch((err) => {
  console.error("\n❌", err.message || err);
  process.exit(1);
});
