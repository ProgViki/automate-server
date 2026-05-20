import * as fs from 'fs';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import axios from 'axios';
import Handlebars from 'handlebars';

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
// PDFShift Configuration
// ---------------------------------------------------------------------------

const PDFSHIFT_API_KEY = process.env.PDFSHIFT_API_KEY;
const PDFSHIFT_API_URL = 'https://api.pdfshift.io/v3/convert/pdf';

if (!PDFSHIFT_API_KEY) {
  console.warn(
    'Warning: PDFSHIFT_API_KEY environment variable is not set. PDF generation may fail.',
  );
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Write PDF buffer to file path
 */
function writePdfToPath(buffer: Buffer, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(outputPath, buffer, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Delete PDF file from disk (cleanup after download)
 */
export function deletePdfFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`PDF file deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to delete PDF file: ${filePath}`, error);
    // Don't throw - this is non-critical cleanup
  }
}

/**
 * Load HTML template from file
 */
function loadTemplate(templatePath: string): string {
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load template: ${templatePath}`, error);
    throw new Error(`Template not found: ${templatePath}`);
  }
}

/**
 * Render Handlebars template with data
 */
function renderTemplate(html: string, data: any): string {
  const template = Handlebars.compile(html);
  return template(data);
}

/**
 * Call PDFShift API to convert HTML to PDF
 */
async function convertHtmlToPdf(html: string): Promise<Buffer> {
  if (!PDFSHIFT_API_KEY) {
    throw new Error(
      'PDFSHIFT_API_KEY is not configured. Please set the environment variable.',
    );
  }

  try {
    const response = await axios.post(
      PDFSHIFT_API_URL,
      {
        source: html,
        landscape: false,
        use_print: false,
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PDFSHIFT_API_KEY,
        },
      },
    );

    return Buffer.from(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      let errorMsg = `PDFShift API error (${status})`;
      
      // Try to parse error response
      if (data) {
        try {
          const errorData = JSON.parse(data.toString());
          errorMsg += `: ${errorData.error || errorData.message || JSON.stringify(errorData)}`;
        } catch {
          errorMsg += `: ${data.toString().substring(0, 200)}`;
        }
      }
      
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.error('PDFShift API error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
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
// generateTransferOrderPDF — Using PDFShift
// ---------------------------------------------------------------------------

export async function generateTransferOrderPDF(
  data: TransferOrderData,
  outputPath: string,
): Promise<string> {

  try {
    // Load the HTML template
    const templatePath = resolve(__dirname, '../templates/transfer-order.html');
    const templateHtml = loadTemplate(templatePath);

    // Render template with data
    const renderedHtml = renderTemplate(templateHtml, data);

    // Convert to PDF using PDFShift
    const pdfBuffer = await convertHtmlToPdf(renderedHtml);

    // Write PDF to file
    await writePdfToPath(pdfBuffer, outputPath);

    return outputPath;
  } catch (error) {
    console.error('Error generating Transfer Order PDF:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// generatePurchaseOrderPDF — Using PDFShift
// ---------------------------------------------------------------------------

export async function generatePurchaseOrderPDF(
  data: PurchaseOrderData,
  outputPath: string,
): Promise<string> {
  console.log('Generating Purchase Order PDF with PDFShift:', data);

  try {
    // Load the HTML template
    const templatePath = resolve(__dirname, '../templates/purchase-order.html');
    const templateHtml = loadTemplate(templatePath);

    // Format quote amount as currency string if it's a number
    const formattedData = {
      ...data,
      quoteAmount:
        typeof data.quoteAmount === 'number'
          ? `N${data.quoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : data.quoteAmount,
    };

    // Render template with data
    const renderedHtml = renderTemplate(templateHtml, formattedData);

    // Convert to PDF using PDFShift
    const pdfBuffer = await convertHtmlToPdf(renderedHtml);

    // Write PDF to file
    await writePdfToPath(pdfBuffer, outputPath);

    console.log(`Purchase Order PDF generated at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating Purchase Order PDF:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// generatePDFFromHTML — backward-compatible stub
// ---------------------------------------------------------------------------

export async function generatePDFFromHTML(
  html: string,
  outputPath: string,
): Promise<string> {
  console.log('Generating PDF from HTML using PDFShift');

  try {
    const pdfBuffer = await convertHtmlToPdf(html);
    await writePdfToPath(pdfBuffer, outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// renderPurchaseOrderHTML — backward-compatible stub
// ---------------------------------------------------------------------------

export function renderPurchaseOrderHTML(_data: PurchaseOrderData): string {
  return '';
}
