import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';
import { LOCALE_ID, inject } from '@angular/core';

/**
 * Formats date/time in the browser's local timezone.
 * If the input string has no timezone (no Z or offset), treats it as UTC.
 * This fixes the common case where backends send UTC without the Z suffix.
 */
@Pipe({ name: 'appDateTime', standalone: true })
export class AppDateTimePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: string | Date | null | undefined, format = 'dd.MM.yyyy HH:mm:ss'): string {
    if (value == null) return '';
    let date: Date;
    if (typeof value === 'string') {
      // If string has no timezone (no Z, no +00:00, no -05:00), treat as UTC
      const s = value.trim();
      if (
        s.length > 0 &&
        !s.endsWith('Z') &&
        !/\d[+-]\d{2}:?\d{2}$/.test(s) &&
        !/\d[+-]\d{4}$/.test(s)
      ) {
        value = s.endsWith(' ') ? s + 'Z' : s + 'Z';
      }
      date = new Date(value);
    } else {
      date = value;
    }
    if (isNaN(date.getTime())) return '';
    const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    return formatDate(date, format, this.locale, timezone);
  }
}
