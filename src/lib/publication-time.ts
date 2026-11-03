import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const publicationTimeZone = "America/Los_Angeles";
const inputFormat = "yyyy-MM-dd'T'HH:mm";

export function publicationLocalTime(value?: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  return formatInTimeZone(value, publicationTimeZone, inputFormat);
}

export function parsePublicationTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = fromZonedTime(value, publicationTimeZone);
  // Reject normalized dates and clock times skipped when daylight saving starts.
  if (Number.isNaN(date.getTime()) || publicationLocalTime(date.toISOString()) !== value) return null;
  return date;
}
