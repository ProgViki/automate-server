import * as fs from 'fs';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import PDFDocument = require('pdfkit');

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface TransferOrderItem {
  sn: number;
  name: string;
  quantity: number;
  available: number;
}

interface TransferOrderData {
  warehouseName: string;
  warehouseLocation: string;
  jobID: string;
  customer: string;
  service: string;
  location: string;
  items: TransferOrderItem[];
}

interface POItem {
  sn: number;
  equipment: string;
  itemCode: string;
  quantity: number;
}

interface PurchaseOrderData {
  poNumber: string;
  poDate: string;
  status: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  vendorName: string;
  vendorContact: string;
  vendorPhone: string;
  vendorEmail: string;
  items: POItem[];
  quoteAmount: number;
}

// ---------------------------------------------------------------------------
// Layout constants (mirrors template dimensions/colours)
// ---------------------------------------------------------------------------

const M = 40; // page margin
const PW = 595.28; // A4 width in points
const CW = PW - M * 2; // content width

// Colours taken directly from the HTML templates
const C = {
  title: '#145392',
  sectionHead: '#08729b',
  sectionBg: '#f3f3f3',
  border: '#0066cc',
  tableHeadBg: '#e8f4f8',
  tableBorder: '#dddddd',
  infoBg: '#f0f8ff',
  text: '#333333',
  muted: '#666666',
  white: '#ffffff',
};

// ---------------------------------------------------------------------------
// Font paths (Raleway)
// ---------------------------------------------------------------------------

const FONT_DIR = path.resolve(__dirname, '../fonts');
const F = {
  regular: path.resolve(FONT_DIR, 'Raleway-Regular.ttf'),
  bold: path.resolve(FONT_DIR, 'Raleway-Bold.ttf'),
};

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function writePdfToPath(
  doc: PDFKit.PDFDocument,
  outputPath: string,
): Promise<void> {
  return new Promise((res, rej) => {
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    stream.on('finish', res);
    stream.on('error', rej);
    doc.end();
  });
}

function rect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  r = 0,
) {
  doc.save().roundedRect(x, y, w, h, r).fill(fill).restore();
}

function hLine(
  doc: PDFKit.PDFDocument,
  x1: number,
  y: number,
  x2: number,
  color = C.tableBorder,
  lw = 0.5,
) {
  doc
    .save()
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(color)
    .lineWidth(lw)
    .stroke()
    .restore();
}

function vLine(
  doc: PDFKit.PDFDocument,
  x: number,
  y1: number,
  y2: number,
  color = C.tableBorder,
  lw = 0.5,
) {
  doc
    .save()
    .moveTo(x, y1)
    .lineTo(x, y2)
    .strokeColor(color)
    .lineWidth(lw)
    .stroke()
    .restore();
}

/** Fetch image from URL and return as buffer */
function fetchImageFromUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol
      .get(url, (res) => {
        const chunks: any[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

/** Attempt to load and render an image; silently fail if not found */
async function tryDrawImage(
  doc: PDFKit.PDFDocument,
  imageUrl: string,
  x: number,
  y: number,
  w: number,
  h?: number,
): Promise<boolean> {
  try {
    const imageBuffer = await fetchImageFromUrl(imageUrl);
    const options: any = { width: w };
    if (h !== undefined) options.height = h;
    doc.image(imageBuffer, x, y, options);
    return true;
  } catch (e) {
    // Image load failed, skip
  }
  return false;
}

/** Write a single line of text with given options, returns the y after the line. */
function txt(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: PDFKit.Mixins.TextOptions & {
    fontSize?: number;
    font?: string;
    color?: string;
  } = {},
): number {
  const { fontSize = 9, font = F.regular, color = C.text, ...rest } = opts;
  doc
    .save()
    .fontSize(fontSize)
    .font(font)
    .fillColor(color)
    .text(text, x, y, rest)
    .restore();
  return y + fontSize + 2;
}

// ---------------------------------------------------------------------------
// Template-aware section blocks
// ---------------------------------------------------------------------------

/**
 * Render a card with a coloured header bar and labelled rows.
 * Returns the y coordinate after the card.
 */
function infoCard(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: Array<{ label: string; value: string }>,
  x: number,
  y: number,
  w: number,
): number {
  const headerH = 30;
  const nameRowH = 22;
  const rowH = 18;
  const padH = 12;
  const labelRows = rows.filter((r) => r.label);
  const nameRow = rows.find((r) => !r.label);
  const cardH =
    headerH + padH + (nameRow ? nameRowH : 0) + labelRows.length * rowH + padH;

  // background
  rect(doc, x, y, w, cardH, C.sectionBg, 3);
  // header bar
  rect(doc, x, y, w, headerH, C.sectionHead, 3);
  txt(doc, title, x + 12, y + 9, {
    fontSize: 11,
    font: F.bold,
    color: C.white,
    width: w - 24,
  });

  let ry = y + headerH + padH;

  // name row — bold, larger
  if (nameRow) {
    txt(doc, nameRow.value || '-', x + 12, ry, {
      fontSize: 10,
      font: F.bold,
      color: C.text,
      width: w - 24,
    });
    ry += nameRowH;
  }

  // labelled rows
  for (const row of labelRows) {
    txt(doc, row.label, x + 12, ry, {
      fontSize: 9,
      font: F.regular,
      color: C.muted,
      width: 68,
    });
    txt(doc, row.value || '-', x + 80, ry, {
      fontSize: 9,
      font: F.regular,
      color: C.text,
      width: w - 92,
    });
    ry += rowH;
  }
  return y + cardH;
}

/**
 * Draw a table with given column definitions.
 * Returns the y after the last row.
 */
function table(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: Array<{
    header: string;
    width: number;
    align?: PDFKit.Mixins.TextOptions['align'];
  }>,
  rows: string[][],
): number {
  const rowH = 28;
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const totalH = rowH * (1 + rows.length);
  const tableTop = y;

  // outer border
  doc
    .save()
    .rect(M, tableTop, totalW, totalH)
    .strokeColor(C.border)
    .lineWidth(0.8)
    .stroke()
    .restore();

  // vertical column dividers (span full table height)
  let cvx = M;
  for (let i = 0; i < cols.length - 1; i++) {
    cvx += cols[i].width;
    vLine(doc, cvx, tableTop, tableTop + totalH, C.tableBorder, 0.5);
  }

  // header row
  rect(doc, M, y, totalW, rowH, C.tableHeadBg);
  hLine(doc, M, y, M + totalW, C.border, 1.5);
  hLine(doc, M, y + rowH, M + totalW, C.border, 0.8);
  let cx = M;
  for (const col of cols) {
    txt(doc, col.header, cx + 6, y + 8, {
      fontSize: 9,
      font: F.bold,
      color: C.text,
      width: col.width - 12,
      align: col.align,
    });
    cx += col.width;
  }
  y += rowH;

  // data rows
  for (const row of rows) {
    cx = M;
    for (let i = 0; i < cols.length; i++) {
      txt(doc, row[i] ?? '-', cx + 6, y + 7, {
        fontSize: 9,
        font: F.regular,
        color: C.text,
        width: cols[i].width - 12,
        align: cols[i].align,
      });
      cx += cols[i].width;
    }
    hLine(doc, M, y + rowH, M + totalW, C.tableBorder, 0.5);
    y += rowH;
  }

  return y;
}

// ---------------------------------------------------------------------------
// createPdfPath — public API unchanged
// ---------------------------------------------------------------------------

export function createPdfPath(prefix: string, id?: string): string {
  const pdfDir = resolve(process.cwd(), 'pdfs');
  if (!existsSync(pdfDir)) mkdirSync(pdfDir, { recursive: true });
  const filename = id
    ? `${prefix}-${id.substring(0, 8).toUpperCase()}-${Date.now()}.pdf`
    : `${prefix}-${Date.now()}.pdf`;
  return resolve(pdfDir, filename);
}

// ---------------------------------------------------------------------------
// generateTransferOrderPDF  (mirrors transfer-order.html)
// ---------------------------------------------------------------------------

export async function generateTransferOrderPDF(
  data: TransferOrderData,
  outputPath: string,
): Promise<string> {
  console.log('Generating Transfer Order PDF with data:', data);

  const doc = new PDFDocument({ size: 'A4', margin: M, autoFirstPage: true });

  // ── Header ────────────────────────────────────────────────────────────────
  txt(doc, 'Transfer Order', M, M, {
    fontSize: 24,
    font: F.bold,
    color: C.title,
  });
  hLine(doc, M, M + 32, M + CW, C.border, 0.5);

  let y = M + 42;

  // ── Two side-by-side info cards ───────────────────────────────────────────
  const cardW = (CW - 16) / 2;

  const warehouseRows = [
    { label: '', value: data.warehouseName },
    { label: 'Location:', value: data.warehouseLocation },
  ];
  const projectRows = [
    { label: 'Job ID:', value: data.jobID },
    { label: 'Customer:', value: data.customer },
    { label: 'Service:', value: data.service },
    { label: 'Location:', value: data.location },
  ];

  const leftBottom = infoCard(
    doc,
    'Warehouse Details:',
    warehouseRows,
    M,
    y,
    cardW,
  );
  const rightBottom = infoCard(
    doc,
    'Project Information:',
    projectRows,
    M + cardW + 16,
    y,
    cardW,
  );
  y = Math.max(leftBottom, rightBottom) + 20;

  // ── Items table ───────────────────────────────────────────────────────────
  txt(doc, 'Equipment/Item Details', M, y, {
    fontSize: 11,
    font: F.bold,
    color: C.text,
  });
  y += 18;

  const cols = [
    { header: 'S/N', width: 35 },
    { header: 'Equipment', width: CW - 35 - 70 - 70 },
    { header: 'Quantity', width: 70, align: 'center' as const },
    { header: 'Available', width: 70, align: 'center' as const },
  ];

  y = table(
    doc,
    y,
    cols,
    data.items.map((item) => [
      String(item.sn),
      item.name,
      String(item.quantity),
      String(item.available),
    ]),
  );

  // ── Disclaimer & footer ───────────────────────────────────────────────────
  const footerY = Math.max(y + 20, 700);
  txt(
    doc,
    'This is an automatically generated Transfer Order. Please retain for records.',
    M,
    footerY - 20,
    { fontSize: 8, color: C.muted, width: CW, align: 'center' },
  );
  hLine(doc, M, footerY, M + CW, '#dddddd', 0.8);

  // Try to load logo from URL
  const logoUrl = 'https://www.zoracom.com/assets/logo-DyYoQ1Iz.png';
  const logoLoaded = await tryDrawImage(doc, logoUrl, M, footerY + 4, 150);

  const copyrightX = logoLoaded ? M + 160 : M;
  const copyrightWidth = logoLoaded ? CW - 160 : CW;
  txt(
    doc,
    'Copyright 2026 @ Zora Communications Limited. All Rights Reserved',
    copyrightX,
    footerY + 6,
    {
      fontSize: 8,
      color: C.muted,
      width: copyrightWidth,
      align: 'right',
    },
  );

  await writePdfToPath(doc, outputPath);
  return outputPath;
}

// ---------------------------------------------------------------------------
// generatePurchaseOrderPDF  (mirrors purchase-order.html)
// ---------------------------------------------------------------------------

export async function generatePurchaseOrderPDF(
  data: PurchaseOrderData,
  outputPath: string,
): Promise<string> {
  const doc = new PDFDocument({ size: 'A4', margin: M, autoFirstPage: true });

  const zoracomLogoUrl = 'https://www.zoracom.com/assets/logo-DyYoQ1Iz.png';
  const serviceXLogoUrl = 'https://sm.miro.zoracom.com/servicex-full-logo.png';

  // ── Header ────────────────────────────────────────────────────────────────
  // Row 1: Zoracom logo | divider | ServiceX logo — centred across the page
  const logoRowY = M;
  const logoW = 80;
  const dividerGap = 12;
  const logoRowTotalW = logoW + dividerGap * 2 + 1 + logoW;
  const logoRowX = M + (CW - logoRowTotalW) / 2;

  await tryDrawImage(doc, zoracomLogoUrl, logoRowX, logoRowY, logoW);

  // Vertical divider between logos
  const divX = logoRowX + logoW + dividerGap;
  doc
    .save()
    .moveTo(divX, logoRowY + 10)
    .lineTo(divX, logoRowY + 70)
    .strokeColor('#cccccc')
    .lineWidth(1)
    .stroke()
    .restore();

  await tryDrawImage(doc, serviceXLogoUrl, divX + dividerGap, logoRowY, logoW);

  // Row 2: "Purchase Order" title — centred
  const titleY = logoRowY + 32;
  txt(doc, 'Purchase Order', M, titleY, {
    fontSize: 26,
    font: F.bold,
    color: C.title,
    width: CW,
    align: 'center',
  });

  hLine(doc, M, titleY + 36, M + CW, C.border, 0.5);

  let y = titleY + 46;

  // ── PO summary info box (centred, #f0f8ff) ────────────────────────────────
  const infoBoxW = 260;
  const infoBoxX = M + (CW - infoBoxW) / 2;
  const infoRows = [
    { label: 'PO Number:', value: data.poNumber },
    { label: 'PO Date:', value: data.poDate },
    { label: 'Status:', value: data.status },
  ];
  const infoBoxH = 16 + infoRows.length * 20 + 12;
  rect(doc, infoBoxX, y, infoBoxW, infoBoxH, C.infoBg, 4);
  let iy = y + 14;
  for (const row of infoRows) {
    txt(doc, row.label, infoBoxX + 10, iy, {
      fontSize: 9,
      font: F.regular,
      color: C.muted,
      width: 110,
      align: 'right',
    });
    txt(doc, row.value || '-', infoBoxX + 128, iy, {
      fontSize: 9,
      font: F.bold,
      color: C.text,
      width: infoBoxW - 138,
    });
    iy += 20;
  }
  y += infoBoxH + 18;

  // ── Company + Vendor cards ────────────────────────────────────────────────
  const cardW = (CW - 16) / 2;

  const companyRows = [
    { label: '', value: data.companyName },
    { label: 'Phone:', value: data.companyPhone },
    { label: 'Email:', value: data.companyEmail },
  ];
  const vendorRows = [
    { label: '', value: data.vendorName },
    { label: 'Contact:', value: data.vendorContact },
    { label: 'Phone:', value: data.vendorPhone },
    { label: 'Email:', value: data.vendorEmail },
  ];

  const leftBottom = infoCard(
    doc,
    'Company Details:',
    companyRows,
    M,
    y,
    cardW,
  );
  const rightBottom = infoCard(
    doc,
    'Vendor Details:',
    vendorRows,
    M + cardW + 16,
    y,
    cardW,
  );
  y = Math.max(leftBottom, rightBottom) + 20;

  // ── Items table ───────────────────────────────────────────────────────────
  txt(doc, 'Equipment/Item Details', M, y, {
    fontSize: 11,
    font: F.bold,
    color: C.text,
  });
  y += 18;

  const cols = [
    { header: 'S/N', width: 35 },
    { header: 'Equipment', width: CW - 35 - 110 - 60 },
    { header: 'Item Code', width: 110 },
    { header: 'Qty', width: 60, align: 'right' as const },
  ];

  y = table(
    doc,
    y,
    cols,
    data.items.map((item) => [
      String(item.sn),
      item.equipment,
      item.itemCode ?? '-',
      String(item.quantity),
    ]),
  );

  // ── Quote amount ──────────────────────────────────────────────────────────
  y += 10;
  const qtyColWidth = 60; // matches the Qty column width from the table
  const totalW = qtyColWidth + 80; // Qty column + Item Code column width
  const totalX = M + CW - totalW;
  txt(doc, 'Quote Amount:', totalX, y + 2, {
    fontSize: 10,
    font: F.bold,
    color: C.text,
    width: 95,
  });
  txt(
    doc,
    `N${(data.quoteAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    totalX + 20,
    y + 2,
    {
      fontSize: 10,
      font: F.regular,
      color: C.text,
      width: 105,
      align: 'right',
    },
  );

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = Math.max(y + 20, 780);
  hLine(doc, M, footerY, M + CW, '#dddddd', 0.8);

  // Try to load logo from URL
  const footerLogoLoaded = await tryDrawImage(
    doc,
    'https://www.zoracom.com/assets/logo-DyYoQ1Iz.png',
    M,
    footerY + 4,
    150,
  );

  const copyrightX = footerLogoLoaded ? M + 160 : M;
  const copyrightWidth = footerLogoLoaded ? CW - 160 : CW;
  txt(
    doc,
    'Copyright 2026 @ Zora Communications Limited. All Rights Reserved',
    copyrightX,
    footerY + 6,
    {
      fontSize: 8,
      color: C.muted,
      width: copyrightWidth,
      align: 'right',
    },
  );

  await writePdfToPath(doc, outputPath);
  return outputPath;
}

// ---------------------------------------------------------------------------
// generatePDFFromHTML — backward-compatible stub
// ---------------------------------------------------------------------------

export async function generatePDFFromHTML(
  html: string,
  outputPath: string,
  options: { format?: 'A4' | 'Letter'; landscape?: boolean } = {},
): Promise<string> {
  const doc = new PDFDocument({
    size: options.format || 'A4',
    layout: options.landscape ? 'landscape' : 'portrait',
    margin: M,
  });

  const plainText = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim();

  doc
    .fontSize(10)
    .font(F.regular)
    .fillColor(C.text)
    .text(plainText, { width: CW });

  await writePdfToPath(doc, outputPath);
  return outputPath;
}

// ---------------------------------------------------------------------------
// renderPurchaseOrderHTML — backward-compatible stub
// ---------------------------------------------------------------------------

export function renderPurchaseOrderHTML(_data: PurchaseOrderData): string {
  return '';
}
