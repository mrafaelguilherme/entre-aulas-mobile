// O endereco da API fica em um so lugar, lido de EXPO_PUBLIC_API_URL.
// No emulador, "adb reverse tcp:3000 tcp:3000" liga o localhost ao computador.
const DEFAULT_API_URL = 'http://localhost:3000';

// Fora do modo de desenvolvimento, so aceita https://. Um app publicado
// que falasse http:// mandaria o token em texto aberto pela rede.
export function assertSecureApiUrl(url: string, isDev: boolean): string {
  const isHttps = url.startsWith('https://');
  const isHttp = url.startsWith('http://');

  if (!isHttps && !isHttp) {
    throw new Error('API_URL must start with http:// or https://');
  }
  if (isHttp && !isDev) {
    throw new Error('API_URL must use https:// outside development');
  }
  return url;
}

export const API_URL = assertSecureApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  __DEV__,
);
