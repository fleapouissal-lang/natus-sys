import { formatDate, toLocalDateKey } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { LoyaltyCardVariant, LoyaltyCustomer } from "@/lib/types";

export type CustomerCsvColumnRequirement =
  | "obligatoire"
  | "optionnel"
  | "export"
  | "auto";

export type CustomerCsvColumnDef = {
  header: string;
  aliases: string[];
  description: string;
  requirement: CustomerCsvColumnRequirement;
  example?: string;
};

export const LOYALTY_CSV_COLUMNS: CustomerCsvColumnDef[] = [
  {
    header: "Nom complet",
    aliases: ["nom complet", "nom", "full_name", "fullname"],
    description: "Nom et prénom du client tel qu'affiché sur la carte fidélité.",
    requirement: "obligatoire",
    example: "Fatima Alami",
  },
  {
    header: "Téléphone",
    aliases: ["téléphone", "telephone", "phone"],
    description: "Numéro de mobile (format marocain recommandé : 06XXXXXXXX).",
    requirement: "obligatoire",
    example: "0612345678",
  },
  {
    header: "Email",
    aliases: ["email", "e-mail"],
    description: "Adresse e-mail du client (facultatif).",
    requirement: "optionnel",
    example: "fatima@exemple.ma",
  },
  {
    header: "N° carte",
    aliases: ["n° carte", "n carte", "card_number", "numero carte"],
    description: "Numéro de carte attribué automatiquement à la création.",
    requirement: "auto",
    example: "",
  },
  {
    header: "Points",
    aliases: ["points", "loyalty_points"],
    description: "Solde de points fidélité (lecture seule à l'export).",
    requirement: "export",
    example: "120",
  },
  {
    header: "Modèle carte",
    aliases: ["modèle carte", "modele carte", "card_variant"],
    description: "Apparence de la carte : champagne, noir ou creme.",
    requirement: "optionnel",
    example: "champagne",
  },
  {
    header: "Actif",
    aliases: ["actif", "active", "is_active"],
    description: "Compte actif (oui) ou désactivé (non) — export uniquement.",
    requirement: "export",
    example: "oui",
  },
  {
    header: "Magasin",
    aliases: ["magasin", "store", "store_name"],
    description: "Magasin d'origine ou de rattachement — export uniquement.",
    requirement: "export",
    example: "Natus Casablanca",
  },
  {
    header: "Date création",
    aliases: ["date création", "date creation", "created_at"],
    description: "Date d'inscription du client — export uniquement.",
    requirement: "export",
    example: "15/03/2026",
  },
];

export const PRO_CSV_COLUMNS: CustomerCsvColumnDef[] = [
  {
    header: "Nom complet",
    aliases: ["nom complet", "nom", "full_name", "fullname"],
    description: "Nom et prénom — obligatoire pour un compte particulier.",
    requirement: "obligatoire",
    example: "Karim Bennani",
  },
  {
    header: "Téléphone",
    aliases: ["téléphone", "telephone", "phone"],
    description: "Mobile du contact — obligatoire pour un compte particulier.",
    requirement: "obligatoire",
    example: "0622334455",
  },
  {
    header: "Email",
    aliases: ["email", "e-mail"],
    description: "E-mail de connexion au portail client Pro.",
    requirement: "obligatoire",
    example: "contact@exemple.ma",
  },
  {
    header: "Type",
    aliases: ["type", "pro_client_type"],
    description: "particulier ou entreprise.",
    requirement: "obligatoire",
    example: "particulier",
  },
  {
    header: "Actif",
    aliases: ["actif", "active", "pro_client_active"],
    description: "oui pour activer immédiatement, non pour laisser en attente.",
    requirement: "optionnel",
    example: "non",
  },
  {
    header: "Entreprise",
    aliases: ["entreprise", "company_name", "société", "societe"],
    description: "Raison sociale — obligatoire si Type = entreprise.",
    requirement: "obligatoire",
    example: "Spa Exemple SARL",
  },
  {
    header: "Responsable",
    aliases: ["responsable", "responsible_name"],
    description: "Nom du contact principal (entreprise).",
    requirement: "optionnel",
    example: "Sara El Amrani",
  },
  {
    header: "ICE",
    aliases: ["ice", "company_ice"],
    description: "Identifiant Commun de l'Entreprise (15 chiffres).",
    requirement: "optionnel",
    example: "123456789012345",
  },
  {
    header: "RC",
    aliases: ["rc", "company_rc"],
    description: "Registre de commerce.",
    requirement: "optionnel",
    example: "RC-12345",
  },
  {
    header: "Pays",
    aliases: ["pays", "country"],
    description: "Pays du client ou de l'entreprise.",
    requirement: "optionnel",
    example: "Maroc",
  },
  {
    header: "Ville",
    aliases: ["ville", "city"],
    description: "Ville du client ou de l'entreprise.",
    requirement: "optionnel",
    example: "Casablanca",
  },
  {
    header: "Adresse",
    aliases: ["adresse", "address"],
    description: "Adresse postale complète.",
    requirement: "optionnel",
    example: "12 avenue Example",
  },
  {
    header: "N° carte",
    aliases: ["n° carte", "n carte", "card_number"],
    description: "Numéro de carte Pro attribué automatiquement.",
    requirement: "auto",
    example: "",
  },
  {
    header: "Magasin",
    aliases: ["magasin", "store", "store_name"],
    description: "Nom exact du magasin de rattachement (doit exister dans Natus).",
    requirement: "obligatoire",
    example: "Natus Rabat",
  },
  {
    header: "Date création",
    aliases: ["date création", "date creation", "created_at"],
    description: "Date de création du compte — export uniquement.",
    requirement: "export",
    example: "15/03/2026",
  },
];

const LOYALTY_HEADERS = LOYALTY_CSV_COLUMNS.map((c) => c.header);
const PRO_HEADERS = PRO_CSV_COLUMNS.map((c) => c.header);

function csvCell(value: string | number | boolean | null | undefined): string {
  const text =
    value == null
      ? ""
      : typeof value === "boolean"
        ? value
          ? "oui"
          : "non"
        : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function requirementLabel(requirement: CustomerCsvColumnRequirement): string {
  switch (requirement) {
    case "obligatoire":
      return "Obligatoire";
    case "optionnel":
      return "Optionnel";
    case "export":
      return "Export";
    case "auto":
      return "Auto";
  }
}

function buildDocumentationLines(
  title: string,
  columns: CustomerCsvColumnDef[],
  extraLines: string[] = []
): string[] {
  const lines = [
    "# =============================================================================",
    `# ${title}`,
    "# =============================================================================",
    ...extraLines,
    "#",
    "# Colonnes (ligne d'en-tête du tableau ci-dessous) :",
    "#",
  ];

  for (const col of columns) {
    lines.push(
      `# • ${col.header} [${requirementLabel(col.requirement)}] — ${col.description}`
    );
  }

  lines.push(
    "#",
    "# La ligne « Guide colonnes » sous l'en-tête décrit chaque champ (ignorée à l'import).",
    "# =============================================================================",
    ""
  );

  return lines;
}

function buildInfoRow(columns: CustomerCsvColumnDef[]): string[] {
  return columns.map((col) => {
    const tag = requirementLabel(col.requirement);
    const hint =
      col.requirement === "auto"
        ? "Généré automatiquement"
        : col.requirement === "export"
          ? "Lecture seule (export)"
          : col.description.split(".")[0] ?? col.description;
    return `[${tag}] ${hint}`;
  });
}

function downloadCsv(filename: string, lines: string[]) {
  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildCsvLines(
  columns: CustomerCsvColumnDef[],
  dataRows: string[][],
  meta: string[]
): string[] {
  return [
    ...meta,
    columns.map((c) => c.header).join(","),
    buildInfoRow(columns).map(csvCell).join(","),
    ...dataRows.map((row) => row.map(csvCell).join(",")),
  ];
}

export function exportLoyaltyCustomersCsv(customers: LoyaltyCustomer[]) {
  const rows = customers.map((c) => [
    c.full_name,
    formatPhoneDisplay(c.phone),
    c.email ?? "",
    c.card_number,
    String(c.loyalty_points),
    c.card_variant ?? "champagne",
    c.is_active !== false ? "oui" : "non",
    c.stores?.name ?? "",
    formatDate(c.created_at),
  ]);

  downloadCsv(
    `clients-fidelite-${toLocalDateKey(new Date())}-${customers.length}.csv`,
    buildCsvLines(LOYALTY_CSV_COLUMNS, rows, [
      ...buildDocumentationLines("EXPORT — CLIENTS FIDÈLES NATUS", LOYALTY_CSV_COLUMNS, [
        `# Généré le ${new Date().toLocaleString("fr-FR")}`,
        `# ${customers.length} client${customers.length > 1 ? "s" : ""}`,
      ]),
    ])
  );
}

export function exportProClientsCsv(customers: LoyaltyCustomer[]) {
  const rows = customers.map((c) => [
    c.full_name,
    formatPhoneDisplay(c.phone),
    c.email ?? "",
    c.pro_client_type === "entreprise" ? "entreprise" : "particulier",
    c.pro_client_active ? "oui" : "non",
    c.company_name ?? "",
    c.responsible_name ?? "",
    c.company_ice ?? "",
    c.company_rc ?? "",
    c.country ?? "",
    c.city ?? "",
    c.address ?? "",
    c.card_number,
    c.stores?.name ?? "",
    formatDate(c.created_at),
  ]);

  downloadCsv(
    `clients-pro-${toLocalDateKey(new Date())}-${customers.length}.csv`,
    buildCsvLines(PRO_CSV_COLUMNS, rows, [
      ...buildDocumentationLines(
        "EXPORT — CLIENTS PROFESSIONNELS NATUS",
        PRO_CSV_COLUMNS,
        [
          `# Généré le ${new Date().toLocaleString("fr-FR")}`,
          `# ${customers.length} compte${customers.length > 1 ? "s" : ""}`,
        ]
      ),
    ])
  );
}

export function downloadLoyaltyCustomersTemplate() {
  const exampleRows: string[][] = [
    [
      "Fatima Alami",
      "0612345678",
      "fatima@exemple.ma",
      "",
      "",
      "champagne",
      "",
      "",
      "",
    ],
    [
      "Youssef Benali",
      "0677889900",
      "",
      "",
      "",
      "noir",
      "",
      "",
      "",
    ],
  ];

  downloadCsv(
    "modele-import-clients-fidelite.csv",
    buildCsvLines(LOYALTY_CSV_COLUMNS, exampleRows, [
      ...buildDocumentationLines(
        "MODÈLE D'IMPORT — CLIENTS FIDÈLES NATUS",
        LOYALTY_CSV_COLUMNS,
        [
          "# Remplissez les lignes d'exemple ou ajoutez les vôtres.",
          "# Colonnes utilisées à l'import : Nom complet, Téléphone, Email, Modèle carte.",
        ]
      ),
    ])
  );
}

export function downloadProClientsTemplate(storeNames: string[] = []) {
  const storeExample = storeNames[0] ?? "Nom exact du magasin";
  const exampleRows: string[][] = [
    [
      "Karim Bennani",
      "0622334455",
      "karim@exemple.ma",
      "particulier",
      "non",
      "",
      "",
      "",
      "",
      "Maroc",
      "Casablanca",
      "",
      "",
      storeExample,
      "",
    ],
    [
      "",
      "",
      "contact@spa-exemple.ma",
      "entreprise",
      "non",
      "Spa Exemple SARL",
      "Sara El Amrani",
      "123456789012345",
      "RC-12345",
      "Maroc",
      "Rabat",
      "12 avenue Example",
      "",
      storeExample,
      "",
    ],
  ];

  downloadCsv(
    "modele-import-clients-pro.csv",
    buildCsvLines(PRO_CSV_COLUMNS, exampleRows, [
      ...buildDocumentationLines("MODÈLE D'IMPORT — CLIENTS PRO NATUS", PRO_CSV_COLUMNS, [
        "# Remplissez une ligne par compte à créer.",
        "# Particulier : Nom complet + Téléphone + Email + Type + Magasin.",
        "# Entreprise : Email + Type + Entreprise + Magasin (+ ICE, RC recommandés).",
        ...(storeNames.length > 0
          ? [`# Magasins disponibles : ${storeNames.join(", ")}`]
          : []),
      ]),
    ])
  );
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isGuideRow(row: string[]): boolean {
  const first = (row[0] ?? "").trim();
  return /^\[(Obligatoire|Optionnel|Export|Auto|INFO)/i.test(first);
}

function isEmptyDataRow(row: string[]): boolean {
  return row.every((cell) => !cell.trim());
}

export function parseCustomerCsv(text: string): { headers: string[]; rows: string[][] } {
  const normalized = text.replace(/^\uFEFF/, "");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const rows = lines
    .slice(1)
    .map(parseCsvLine)
    .filter((row) => !isGuideRow(row) && !isEmptyDataRow(row));

  return { headers, rows };
}

function headerIndex(headers: string[], columns: CustomerCsvColumnDef[], key: string): number {
  const col = columns.find((c) => c.header === key);
  const aliases = col?.aliases ?? [key];
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], index: number): string {
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

function parseCardVariant(value: string): LoyaltyCardVariant | undefined {
  const v = value.trim().toLowerCase();
  if (v === "champagne" || v === "noir" || v === "creme") return v;
  return undefined;
}

function parseBool(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (["oui", "yes", "true", "1", "actif"].includes(v)) return true;
  if (["non", "no", "false", "0", "inactif"].includes(v)) return false;
  return undefined;
}

export type LoyaltyImportRow = {
  line: number;
  fullName: string;
  phone: string;
  email?: string;
  cardVariant?: LoyaltyCardVariant;
};

export type ProImportRow = {
  line: number;
  clientType: "entreprise" | "particulier";
  email: string;
  storeName: string;
  fullName?: string;
  phone?: string;
  companyName?: string;
  responsibleName?: string;
  companyIce?: string;
  companyRc?: string;
  country?: string;
  city?: string;
  address?: string;
  activate?: boolean;
};

export function parseLoyaltyImportRows(
  text: string
): { rows: LoyaltyImportRow[]; errors: string[] } {
  const { headers, rows } = parseCustomerCsv(text);
  const errors: string[] = [];
  if (headers.length === 0) {
    return { rows: [], errors: ["Fichier CSV vide ou invalide"] };
  }

  const nameIdx = headerIndex(headers, LOYALTY_CSV_COLUMNS, "Nom complet");
  const phoneIdx = headerIndex(headers, LOYALTY_CSV_COLUMNS, "Téléphone");
  const emailIdx = headerIndex(headers, LOYALTY_CSV_COLUMNS, "Email");
  const variantIdx = headerIndex(headers, LOYALTY_CSV_COLUMNS, "Modèle carte");

  if (nameIdx < 0 || phoneIdx < 0) {
    return {
      rows: [],
      errors: ["Colonnes obligatoires manquantes : Nom complet, Téléphone"],
    };
  }

  const parsed: LoyaltyImportRow[] = [];
  rows.forEach((row, index) => {
    const line = index + 3;
    const fullName = cell(row, nameIdx);
    const phone = cell(row, phoneIdx);
    if (!fullName && !phone) return;
    if (!fullName || !phone) {
      errors.push(`Ligne ${line} : nom et téléphone requis`);
      return;
    }
    parsed.push({
      line,
      fullName,
      phone,
      email: cell(row, emailIdx) || undefined,
      cardVariant: parseCardVariant(cell(row, variantIdx)),
    });
  });

  return { rows: parsed, errors };
}

export function parseProImportRows(
  text: string
): { rows: ProImportRow[]; errors: string[] } {
  const { headers, rows } = parseCustomerCsv(text);
  const errors: string[] = [];
  if (headers.length === 0) {
    return { rows: [], errors: ["Fichier CSV vide ou invalide"] };
  }

  const typeIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Type");
  const emailIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Email");
  const storeIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Magasin");
  const nameIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Nom complet");
  const phoneIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Téléphone");
  const companyIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Entreprise");
  const respIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Responsable");
  const iceIdx = headerIndex(headers, PRO_CSV_COLUMNS, "ICE");
  const rcIdx = headerIndex(headers, PRO_CSV_COLUMNS, "RC");
  const countryIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Pays");
  const cityIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Ville");
  const addressIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Adresse");
  const activeIdx = headerIndex(headers, PRO_CSV_COLUMNS, "Actif");

  if (typeIdx < 0 || emailIdx < 0 || storeIdx < 0) {
    return {
      rows: [],
      errors: ["Colonnes obligatoires manquantes : Type, Email, Magasin"],
    };
  }

  const parsed: ProImportRow[] = [];
  rows.forEach((row, index) => {
    const line = index + 3;
    const email = cell(row, emailIdx);
    const storeName = cell(row, storeIdx);
    const rawType = cell(row, typeIdx).toLowerCase();
    if (!email && !storeName && !rawType) return;

    const clientType =
      rawType === "entreprise" || rawType === "professionnel" || rawType === "pro"
        ? "entreprise"
        : rawType === "particulier"
          ? "particulier"
          : null;

    if (!clientType) {
      errors.push(`Ligne ${line} : type invalide (particulier ou entreprise)`);
      return;
    }
    if (!email) {
      errors.push(`Ligne ${line} : email requis`);
      return;
    }
    if (!storeName) {
      errors.push(`Ligne ${line} : magasin requis`);
      return;
    }

    const fullName = cell(row, nameIdx) || undefined;
    const phone = cell(row, phoneIdx) || undefined;
    const companyName = cell(row, companyIdx) || undefined;

    if (clientType === "particulier" && (!fullName || !phone)) {
      errors.push(`Ligne ${line} : nom et téléphone requis pour un particulier`);
      return;
    }
    if (clientType === "entreprise" && !companyName) {
      errors.push(`Ligne ${line} : entreprise requise pour un compte professionnel`);
      return;
    }

    parsed.push({
      line,
      clientType,
      email,
      storeName,
      fullName,
      phone,
      companyName,
      responsibleName: cell(row, respIdx) || undefined,
      companyIce: cell(row, iceIdx) || undefined,
      companyRc: cell(row, rcIdx) || undefined,
      country: cell(row, countryIdx) || undefined,
      city: cell(row, cityIdx) || undefined,
      address: cell(row, addressIdx) || undefined,
      activate: parseBool(cell(row, activeIdx)),
    });
  });

  return { rows: parsed, errors };
}
