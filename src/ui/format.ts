// Display formatting and link safety. Pure functions.

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(date.getTime()) ? iso : dateFmt.format(date);
}

export function formatRef(last4: string): string {
  return `•••• ${last4}`;
}

/** Only http(s) links render as links; anything else stays text. */
export function safeUrl(value: string): URL | null {
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

export function telHref(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? `tel:${digits}` : null;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
