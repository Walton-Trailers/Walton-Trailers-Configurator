import jsPDF from "jspdf";
import type { TrailerModel } from "@shared/schema";

interface TrailerOption {
  id: number;
  name: string;
  price: number;
  category: string;
  isMultiSelect?: boolean;
  isPerFt?: boolean;
}

interface ResolvedSpecs {
  gvwr?: string | number | null;
  payload?: string | number | null;
  deckSize?: string | number | null;
}

// ─── Font loading ──────────────────────────────────────────────────────────────
// jsPDF ships built-in helvetica / times / courier but not Roboto. We lazy-load
// Roboto Regular + Bold from a public CDN once per page session and register
// them with jsPDF's VFS so all generated PDFs render in Roboto. If the fetch
// fails for any reason (offline, CDN blip) we silently fall back to helvetica
// so PDF generation never throws on a font lookup.
const ROBOTO_REGULAR_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto/src/hinted/Roboto-Regular.ttf";
const ROBOTO_BOLD_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/roboto/src/hinted/Roboto-Bold.ttf";

let robotoLoadPromise: Promise<boolean> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

// Returns true if Roboto registered successfully on this pdf instance (and the
// shared VFS), false if we should fall back to helvetica.
async function ensureRobotoLoaded(pdf: jsPDF): Promise<boolean> {
  if (!robotoLoadPromise) {
    robotoLoadPromise = (async () => {
      try {
        const [reg, bold] = await Promise.all([
          fetchFontAsBase64(ROBOTO_REGULAR_URL),
          fetchFontAsBase64(ROBOTO_BOLD_URL),
        ]);
        (window as any).__robotoFontData = { reg, bold };
        return true;
      } catch (err) {
        console.warn("Roboto font load failed, falling back to helvetica:", err);
        return false;
      }
    })();
  }
  const ok = await robotoLoadPromise;
  if (!ok) return false;
  const data = (window as any).__robotoFontData as { reg: string; bold: string };
  // jsPDF instances each need their own VFS entries before addFont
  pdf.addFileToVFS("Roboto-Regular.ttf", data.reg);
  pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  pdf.addFileToVFS("Roboto-Bold.ttf", data.bold);
  pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  return true;
}

// ─── Category labels ──────────────────────────────────────────────────────────
// Map the lower-case `category` field on each option to the friendly label
// shown in the UI. Mirrors the label switch in configurator.tsx; unknown
// categories get title-cased.
function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    tires: "Tires",
    ramps: "Ramps",
    color: "Color",
    length: "Length",
    extras: "Additional Options",
    deck: "Deck Length",
    walls: "Wall Height",
    winch: "Winch",
    jack: "Jack",
    tarp: "Tarp",
    pullOption: "Pull Type",
  };
  if (map[category]) return map[category];
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Sort categories with a sensible default order (length first, then ramps/
// color etc.). Unknown categories sort alphabetically at the end.
const CATEGORY_PRIORITY = [
  "length",
  "pullOption",
  "color",
  "ramps",
  "tires",
  "walls",
  "deck",
  "jack",
  "winch",
  "tarp",
  "extras",
];

function sortCategoryKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = CATEGORY_PRIORITY.indexOf(a);
    const ib = CATEGORY_PRIORITY.indexOf(b);
    const ra = ia < 0 ? 1000 : ia;
    const rb = ib < 0 ? 1000 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

function formatPrice(price: number | undefined | null, isPerFt?: boolean): string {
  if (price == null) return "—";
  if (price === 0) return "Standard";
  const sign = price > 0 ? "+" : "-";
  const abs = Math.abs(price);
  return `${sign}$${abs.toLocaleString()}${isPerFt ? "/ft" : ""}`;
}

// ─── Main entry ───────────────────────────────────────────────────────────────
export async function generateConfigurationPDF(
  model: TrailerModel,
  selectedOptions: Record<string, any>,
  totalPrice: number,
  options: TrailerOption[] = [],
  specs: ResolvedSpecs = {},
): Promise<void> {
  const pdf = new jsPDF();
  const usingRoboto = await ensureRobotoLoaded(pdf);
  const font = usingRoboto ? "Roboto" : "helvetica";

  // Header
  pdf.setFont(font, "bold");
  pdf.setFontSize(20);
  pdf.text("WALTON TRAILERS", 20, 25);

  pdf.setFontSize(16);
  pdf.text("Configuration Summary", 20, 35);

  pdf.setFont(font, "normal");
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 25);

  // ── Trailer Specifications ──
  pdf.setFont(font, "bold");
  pdf.setFontSize(14);
  pdf.text("Trailer Specifications", 20, 50);

  pdf.setFont(font, "normal");
  pdf.setFontSize(11);
  let y = 60;
  const dash = "—";
  const fallback = (v: ResolvedSpecs[keyof ResolvedSpecs], modelVal: any) =>
    v != null && v !== "" ? String(v) : modelVal != null && modelVal !== "" ? String(modelVal) : dash;

  pdf.text(`Model: ${model.name ?? model.modelId ?? dash}`, 20, y); y += 8;
  pdf.text(`GVWR: ${fallback(specs.gvwr, (model as any).gvwr)}`, 20, y); y += 8;
  pdf.text(`Payload: ${fallback(specs.payload, (model as any).payload)}`, 20, y); y += 8;
  pdf.text(`Deck Size: ${fallback(specs.deckSize, (model as any).deckSize)}`, 20, y); y += 8;
  pdf.text(`Axles: ${(model as any).axles ?? dash}`, 20, y); y += 15;

  // ── Selected Configuration (Category | Selection | Price table) ──
  // Build one row per category (deduplicating by category — for multi-select
  // categories with quantity, each selected option still gets its own row so
  // admins can see exactly what was picked).
  type Row = { category: string; selection: string; price: number; isPerFt?: boolean };
  const rows: Row[] = [];

  // Pull-type lookup: trailer_models.pulltype_options is a JSON map keyed by
  // length name (e.g. {"14' (B)": "Bumper Pull", "22'": "Gooseneck"}). Used to
  // render the length row as `22' - Gooseneck` in the PDF.
  const pullTypeMap: Record<string, string> = (() => {
    const raw = (model as any).pulltypeOptions ?? (model as any).pulltype_options;
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw as Record<string, string>;
  })();

  for (const cat of sortCategoryKeys(Object.keys(selectedOptions))) {
    const raw = selectedOptions[cat];
    if (raw == null) continue;
    const ids = Array.isArray(raw) ? raw : [raw];
    for (const id of ids) {
      const opt = options.find((o) => o.id === id);
      if (!opt) continue;
      const isLength = (opt.category || cat) === "length";
      let selection = opt.name;
      if (isLength) {
        // Prefer the explicit pulltype_options map. Fall back to parsing the
        // (B)/(G) suffix some models encode in the length name itself.
        const pt = pullTypeMap[opt.name]
          ?? (/\(B\)/.test(opt.name) ? "Bumper Pull"
              : /\(G\)/.test(opt.name) ? "Gooseneck"
              : "");
        if (pt) selection = `${opt.name} - ${pt}`;
      }
      rows.push({
        category: isLength ? "Length / Pull Type" : categoryLabel(opt.category || cat),
        selection,
        price: opt.price,
        isPerFt: opt.isPerFt,
      });
    }
  }

  if (rows.length > 0) {
    pdf.setFont(font, "bold");
    pdf.setFontSize(14);
    pdf.text("Selected Configuration", 20, y);
    y += 8;

    // Column geometry
    const colCategoryX = 20;
    const colSelectionX = 75;
    const colPriceRightX = 190; // right-aligned
    const headerY = y;

    pdf.setFontSize(10);
    pdf.setFont(font, "bold");
    pdf.text("Category", colCategoryX, headerY);
    pdf.text("Selection", colSelectionX, headerY);
    pdf.text("Price", colPriceRightX, headerY, { align: "right" });
    y += 2;
    pdf.setLineWidth(0.3);
    pdf.line(20, y, 190, y);
    y += 5;

    pdf.setFont(font, "normal");
    pdf.setFontSize(10);
    const lineHeight = 6;

    for (const r of rows) {
      // Page break if we'd overflow (jsPDF letter is ~280 usable)
      if (y > 270) {
        pdf.addPage();
        y = 25;
      }
      const catLines = pdf.splitTextToSize(r.category, 50);
      const selLines = pdf.splitTextToSize(r.selection, 105);
      const rowLines = Math.max(catLines.length, selLines.length);
      pdf.text(catLines, colCategoryX, y);
      pdf.text(selLines, colSelectionX, y);
      pdf.text(formatPrice(r.price, r.isPerFt), colPriceRightX, y, { align: "right" });
      y += lineHeight * rowLines;
    }

    y += 6;
  }

  // ── Pricing Breakdown ──
  if (y > 250) { pdf.addPage(); y = 25; }
  pdf.setFont(font, "bold");
  pdf.setFontSize(14);
  pdf.text("Pricing Breakdown", 20, y);
  y += 8;

  pdf.setFont(font, "normal");
  pdf.setFontSize(11);

  pdf.text("Base Price", 20, y);
  pdf.text(`$${(model.basePrice || 0).toLocaleString()}`, 190, y, { align: "right" });
  y += 6;

  for (const r of rows) {
    if (r.price === 0) continue;
    if (y > 270) { pdf.addPage(); y = 25; }
    const label = `${r.category}: ${r.selection}`;
    const labelLines = pdf.splitTextToSize(label, 140);
    pdf.text(labelLines, 20, y);
    pdf.text(formatPrice(r.price, r.isPerFt), 190, y, { align: "right" });
    y += 6 * labelLines.length;
  }

  pdf.setLineWidth(0.5);
  pdf.line(20, y + 1, 190, y + 1);
  y += 8;

  pdf.setFont(font, "bold");
  pdf.setFontSize(12);
  pdf.text("Total MSRP", 20, y);
  pdf.text(`$${totalPrice.toLocaleString()}`, 190, y, { align: "right" });

  // Footer
  y += 18;
  pdf.setFont(font, "normal");
  pdf.setFontSize(9);
  pdf.text("This is a preliminary configuration. Final pricing may vary.", 20, y);
  pdf.text("Contact your authorized Walton dealer for a formal quote.", 20, y + 5);

  pdf.save(`${model.modelId || "trailer"}-configuration.pdf`);
}

// Backward-compat wrapper for callers that don't pass resolved specs.
export async function generatePDF(
  model: TrailerModel,
  selectedOptions: Record<string, any>,
  totalPrice: number,
): Promise<void> {
  return generateConfigurationPDF(model, selectedOptions, totalPrice, [], {});
}
