export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps an async route so thrown errors reach the error handler.
export const route = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const paiseFromRupees = value => {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const total = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(total) ? total : null;
};

export const rupees = minor => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minor / 100);

export function text(value, { field, max = 200, required = true, pattern, message } = {}) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result && required) throw new HttpError(400, field + ' is required.');
  if (result.length > max) throw new HttpError(400, field + ' is too long.');
  if (result && pattern && !pattern.test(result)) throw new HttpError(400, message || field + ' is not valid.');
  return result;
}
