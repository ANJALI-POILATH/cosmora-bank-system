import { useEffect, useRef, useState } from 'react';

export const money = minor => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minor / 100);
export const time = value => value ? new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(value)) : '—';

export const statusNames = {
  PENDING: 'Pending', PROCESSING: 'Processing', COMPLETED: 'Completed', REJECTED: 'Rejected', MANUAL_REVIEW: 'Manual review',
};
export const statusColor = {
  PENDING: 'warning', PROCESSING: 'info', COMPLETED: 'success', REJECTED: 'error', MANUAL_REVIEW: 'secondary',
};
export const rejectionNames = {
  INSUFFICIENT_FUNDS: 'Insufficient available balance',
  LIMIT_EXCEEDED: 'Transfer limit exceeded',
  DESTINATION_ACCOUNT_UNAVAILABLE: 'The destination is unavailable',
};
export const reason = code => code ? (rejectionNames[code] || code.toLowerCase().replaceAll('_', ' ')) : '';
export const byId = (directory, id) => directory.find(bank => bank.bankId === id)?.bankName || id;

// Smoothly animates a number toward its latest value (for balances).
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const origin = from.current;
    let frame;
    const step = now => {
      const progress = reduced ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(origin + (target - origin) * eased);
      from.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
