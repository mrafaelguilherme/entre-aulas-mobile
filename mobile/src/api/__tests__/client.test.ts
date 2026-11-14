import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { api, getErrorMessage, getStatus, setAuthToken, setUnauthorizedHandler } from '../client';

// Troca a camada que fala com a rede por uma funcao controlada pelo teste.
const adapter = jest.fn();
api.defaults.adapter = adapter;

// Faz a "rede" responder com um status de erro para a proxima requisicao.
function failWith(status: number, data: unknown = {}) {
  adapter.mockImplementationOnce((config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
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
      ),
    ),
  );
}

function succeed() {
  adapter.mockImplementationOnce((config: InternalAxiosRequestConfig) =>
    Promise.resolve({ status: 200, statusText: 'OK', headers: {}, config, data: {} }),
  );
}

// Espera a requisicao falhar e devolve o erro, para o teste examinar.
async function errorOf(request: Promise<unknown>): Promise<unknown> {
  try {
    await request;
    throw new Error('the request should have failed');
  } catch (error) {
    return error;
  }
}

describe('getErrorMessage', () => {
  it('explains a network failure', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getErrorMessage(error)).toBe('Não foi possível conectar à API.');
  });

  it('maps each status to a clear message', async () => {
    const cases: [number, string][] = [
      [403, 'Você não tem permissão para esta ação.'],
      [404, 'Conteúdo não encontrado.'],
      [409, 'Este e-mail não está disponível.'],
      [429, 'Muitas tentativas. Aguarde e tente de novo.'],
      [500, 'Ocorreu um erro. Tente novamente.'],
    ];
    setAuthToken(null);
    for (const [status, message] of cases) {
      failWith(status);
      const error = await errorOf(api.get('/posts'));
      expect(getStatus(error)).toBe(status);
      expect(getErrorMessage(error)).toBe(message);
    }
  });

  it('a 403 asking for a password change says so', async () => {
    setAuthToken('token-123');
    failWith(403, { code: 'PASSWORD_CHANGE_REQUIRED' });
    const error = await errorOf(api.get('/posts'));
    expect(getErrorMessage(error)).toBe('Troque sua senha para continuar.');
  });

  it('a 401 without a token means wrong credentials', async () => {
    setAuthToken(null);
    failWith(401);
    const error = await errorOf(api.post('/auth/signin', {}));
    expect(getErrorMessage(error)).toBe('E-mail ou senha inválidos.');
  });

  it('a 401 with a token means the session is gone', async () => {
    setAuthToken('token-123');
    failWith(401);
    const error = await errorOf(api.get('/me'));
    expect(getErrorMessage(error)).toBe('Sua sessão expirou. Entre novamente.');
  });

  it('an unknown error gets the generic message and no status', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Ocorreu um erro. Tente novamente.');
    expect(getStatus(new Error('boom'))).toBeUndefined();
  });
});

describe('api client', () => {
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    onUnauthorized.mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });

  it('sends the Bearer token after setAuthToken', async () => {
    setAuthToken('token-123');
    succeed();
    await api.get('/me');
    const config = adapter.mock.calls.at(-1)?.[0] as InternalAxiosRequestConfig;
    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('sends no Authorization header without a token', async () => {
    setAuthToken(null);
    succeed();
    await api.get('/posts');
    const config = adapter.mock.calls.at(-1)?.[0] as InternalAxiosRequestConfig;
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('401 on a request that sent a token calls the unauthorized handler', async () => {
    setAuthToken('token-123');
    failWith(401);
    await errorOf(api.get('/me'));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401 on a request without a token does not call the unauthorized handler', async () => {
    setAuthToken(null);
    failWith(401);
    await errorOf(api.post('/auth/signin', {}));
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('other errors do not call the unauthorized handler', async () => {
    setAuthToken('token-123');
    failWith(403);
    await errorOf(api.get('/teachers'));
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
