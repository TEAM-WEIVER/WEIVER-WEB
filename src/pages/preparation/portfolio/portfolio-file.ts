export const MAX_PDF_SIZE = 20 * 1024 * 1024;

export function isPortfolioPdf(file: File) {
  return file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name));
}

export function isValidPortfolioFile(file: File) {
  return isPortfolioPdf(file) && file.size <= MAX_PDF_SIZE;
}
