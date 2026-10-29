import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function formatINRPrecise(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(Number(n) || 0);
}

export function parseToDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  // Firestore Timestamp with toDate()
  if (typeof input.toDate === 'function') {
    try {
      const d = input.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {}
  }
  // Firestore Timestamp serialized as { seconds: number } or { _seconds: number }
  if (typeof input === 'object') {
    if (typeof input.seconds === 'number') {
      const d = new Date(input.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof input._seconds === 'number') {
      const d = new Date(input._seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }
  // Number (epoch ms or epoch seconds)
  if (typeof input === 'number') {
    const d = new Date(input > 1e11 ? input : input * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  // String
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === 'invalid date') return null;
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
    // Check if numeric string
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      const dNum = new Date(num > 1e11 ? num : num * 1000);
      if (!isNaN(dNum.getTime())) return dNum;
    }
  }
  return null;
}

export function formatDate(iso: any): string {
  const d = parseToDate(iso);
  if (!d) return 'Recently';
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: any): string {
  const d = parseToDate(iso);
  if (!d) return 'Recently';
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(iso: any): string {
  const d = parseToDate(iso);
  if (!d) return 'Just now';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'Just now';
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(d);
}

export function initials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
  return (email || 'U').slice(0, 2).toUpperCase();
}

export function ratingStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

export function timeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 20; h++) {
    slots.push(`${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`);
    slots.push(`${h % 12 || 12}:30 ${h < 12 ? 'AM' : 'PM'}`);
  }
  return slots;
}

export function slotToISO(date: Date, slot: string): string {
  const m = slot.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/);
  if (!m) return new Date(date).toISOString();
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3];
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const d = new Date(date);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

export function classNames(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function getApiUrl(path: string): string {
  const base = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL)) || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base) {
    return `${base.replace(/\/$/, '')}${cleanPath}`;
  }
  return cleanPath;
}
