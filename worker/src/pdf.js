import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildPdf as buildSharedPdf } from "../../docs/pdf-core.js";

// Mesmo documento no navegador e no servidor opcional.
export function buildPdf(result, date) {
  return buildSharedPdf(result, date, { PDFDocument, StandardFonts, rgb });
}
