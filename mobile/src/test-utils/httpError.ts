import { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Um erro HTTP como o axios entrega, para os testes das telas.
// withToken: true simula uma requisicao que levou o cracha (token).
export function httpError(status: number, withToken = false, data: unknown = {}) {
  const config = {
    headers: withToken ? { Authorization: 'Bearer token-de-teste' } : {},
  } as unknown as InternalAxiosRequestConfig;
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data,
    },
  );
}

export const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
