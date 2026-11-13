// Carrega a biblioteca somente ao gerar o PDF. Tudo vem do próprio site.
export async function buildPdf(result, date = new Date()) {
  const [pdfLib, { buildPdf: buildSharedPdf }] = await Promise.all([
    import("./vendor/pdf-lib-1.17.1.esm.min.js"),
    import("./pdf-core.js"),
  ]);
  return buildSharedPdf(result, date, pdfLib);
}
