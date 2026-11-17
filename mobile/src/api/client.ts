import axios, { InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/env';

// Toda lista pede 20 itens por pagina. A API aceita no maximo 50.
export const PAGE_SIZE = 20;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// O token fica so em memoria aqui. Quem guarda no aparelho e o AuthContext.
let token: string | null = null;
let onUnauthorized: () => void = () => {};

export function setAuthToken(next: string | null): void {
  token = next;
}

// O AuthContext registra o que fazer quando a sessao deixa de valer.
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// Antes de sair: cola o cracha (token) em toda requisicao, se houver um.
api.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Ao voltar: um 401 em requisicao que levou token significa sessao perdida
// (expirou, a senha mudou, saiu em outro aparelho ou a conta foi excluida).
// Um 401 sem token e so um login errado, e nao mexe na sessao.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && hadToken(error.config)) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

function hadToken(config?: InternalAxiosRequestConfig): boolean {
  return Boolean(config?.headers?.Authorization);
}

// O status HTTP de um erro da API, ou undefined se nao houve resposta.
export function getStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

// Traduz qualquer erro para uma frase que a tela pode mostrar.
// Nunca inclui o corpo da resposta nem dados da pessoa.
export function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Ocorreu um erro. Tente novamente.';
  }
  if (!error.response) {
    return 'Não foi possível conectar à API.';
  }

  const data = error.response.data as { code?: string } | undefined;

  switch (error.response.status) {
    case 401:
      return hadToken(error.config)
        ? 'Sua sessão expirou. Entre novamente.'
        : 'E-mail ou senha inválidos.';
    case 403:
      return data?.code === 'PASSWORD_CHANGE_REQUIRED'
        ? 'Troque sua senha para continuar.'
        : 'Você não tem permissão para esta ação.';
    case 404:
      return 'Conteúdo não encontrado.';
    case 409:
      return 'Este e-mail não está disponível.';
    case 429:
      return 'Muitas tentativas. Aguarde e tente de novo.';
    default:
      return 'Ocorreu um erro. Tente novamente.';
  }
}
