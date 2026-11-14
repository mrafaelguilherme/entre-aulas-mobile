import { assertSecureApiUrl } from '../../config/env';

describe('assertSecureApiUrl', () => {
  it('rejects http:// outside development', () => {
    expect(() => assertSecureApiUrl('http://api.exemplo.com', false)).toThrow();
  });

  it('accepts http://localhost in development', () => {
    expect(assertSecureApiUrl('http://localhost:3000', true)).toBe('http://localhost:3000');
  });

  it('accepts https:// outside development', () => {
    expect(assertSecureApiUrl('https://api.exemplo.com', false)).toBe('https://api.exemplo.com');
  });

  it('rejects an address that is not http or https', () => {
    expect(() => assertSecureApiUrl('ftp://api.exemplo.com', true)).toThrow();
  });
});
