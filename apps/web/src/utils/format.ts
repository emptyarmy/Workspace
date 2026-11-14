/** Datum (YYYY-MM-DD) bzw. Zeitpunkt (ISO) in der gewählten Sprache formatieren. */
export function formatDate(locale: string, iso: string | null | undefined): string {
  if (!iso) return '';
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(locale: string, iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
