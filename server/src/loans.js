import { HttpError } from './http.js';

export const loanProducts = {
  PERSONAL: { label: 'Personal loan', annualRate: 12, minMinor: 10_000_00, maxMinor: 5_00_000_00, maxMonths: 60 },
  EDUCATION: { label: 'Education loan', annualRate: 9.5, minMinor: 25_000_00, maxMinor: 10_00_000_00, maxMonths: 120 },
  VEHICLE: { label: 'Vehicle loan', annualRate: 10, minMinor: 50_000_00, maxMinor: 10_00_000_00, maxMonths: 84 },
  HOME: { label: 'Home loan', annualRate: 8.5, minMinor: 1_00_000_00, maxMinor: 50_00_000_00, maxMonths: 240 },
};

// Standard reducing-balance EMI, rounded up to the next paisa.
export function emi(principalMinor, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (!r) return Math.ceil(principalMinor / months);
  const factor = (1 + r) ** months;
  return Math.ceil((principalMinor * r * factor) / (factor - 1));
}

export function quote(type, principalMinor, termMonths) {
  const product = loanProducts[type];
  if (!product) throw new HttpError(400, 'Choose a loan type.');
  if (!Number.isSafeInteger(principalMinor) || principalMinor < product.minMinor || principalMinor > product.maxMinor) {
    throw new HttpError(400, `${product.label} amounts must be between ₹${(product.minMinor / 100).toLocaleString('en-IN')} and ₹${(product.maxMinor / 100).toLocaleString('en-IN')}.`);
  }
  if (!Number.isInteger(termMonths) || termMonths < 6 || termMonths > product.maxMonths) {
    throw new HttpError(400, `Choose a term between 6 and ${product.maxMonths} months.`);
  }
  const emiMinor = emi(principalMinor, product.annualRate, termMonths);
  return { annualRate: product.annualRate, emiMinor, totalPayableMinor: emiMinor * termMonths };
}
