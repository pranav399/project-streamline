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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
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
