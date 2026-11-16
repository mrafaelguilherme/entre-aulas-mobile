import { formatDate, formatDateTime, formatShortDate } from '../dates';

// Meio-dia em UTC: a data e a mesma em qualquer fuso do Brasil.
const ISO = '2026-11-12T15:00:00.000Z';

describe('dates', () => {
  it('formatDate writes the long date in Portuguese', () => {
    expect(formatDate(ISO)).toBe('12 de novembro de 2026');
  });

  it('formatShortDate writes day/month/year', () => {
    expect(formatShortDate(ISO)).toBe('12/11/2026');
  });

  it('formatDateTime adds the time', () => {
    expect(formatDateTime(ISO)).toMatch(/^12\/11\/2026 às \d{2}:\d{2}$/);
  });

  it('an empty value gives an empty text', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatShortDate(undefined)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });
});
