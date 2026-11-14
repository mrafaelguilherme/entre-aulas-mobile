import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Alert, Pressable, Text } from 'react-native';
import * as authApi from '../../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../../api/client';
import { SessionUser } from '../../types';
import { AuthProvider, useAuth } from '../AuthContext';

// O cofre do aparelho e a API nao existem no Jest: entram substitutos (mocks).
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('../../api/auth');
jest.mock('../../api/client', () => ({
  setAuthToken: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const ana: SessionUser = {
  id: 't1',
  name: 'Ana',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};

const mocked = {
  getItem: SecureStore.getItemAsync as jest.Mock,
  setItem: SecureStore.setItemAsync as jest.Mock,
  deleteItem: SecureStore.deleteItemAsync as jest.Mock,
  signIn: authApi.signIn as jest.Mock,
  getMe: authApi.getMe as jest.Mock,
  signOut: authApi.signOut as jest.Mock,
  setAuthToken: setAuthToken as jest.Mock,
  setUnauthorizedHandler: setUnauthorizedHandler as jest.Mock,
};

// Uma tela minima que mostra o estado da sessao e dispara as acoes.
function Probe() {
  const { loading, user, signIn, signOut } = useAuth();
  return (
    <>
      <Text>{loading ? 'carregando' : (user?.name ?? 'sem usuario')}</Text>
      <Pressable
        onPress={() => signIn('ana@escola.com.br', 'senha-de-teste-com-15').catch(() => {})}
      >
        <Text>entrar</Text>
      </Pressable>
      <Pressable onPress={() => signOut()}>
        <Text>sair</Text>
      </Pressable>
    </>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getItem.mockResolvedValue(null);
  mocked.setItem.mockResolvedValue(undefined);
  mocked.deleteItem.mockResolvedValue(undefined);
  mocked.signIn.mockResolvedValue('token-123');
  mocked.getMe.mockResolvedValue(ana);
  mocked.signOut.mockResolvedValue(undefined);
});

describe('AuthProvider', () => {
  it('finishes loading with no user when there is no saved token', async () => {
    await renderProbe();
    expect(await screen.findByText('sem usuario')).toBeOnTheScreen();
    expect(mocked.getMe).not.toHaveBeenCalled();
  });

  it('finishes loading with the user when /me succeeds', async () => {
    mocked.getItem.mockResolvedValue('token-salvo');
    await renderProbe();
    expect(await screen.findByText('Ana')).toBeOnTheScreen();
    expect(mocked.setAuthToken).toHaveBeenCalledWith('token-salvo');
  });

  it('clears the token and has no user when /me answers 401', async () => {
    mocked.getItem.mockResolvedValue('token-velho');
    mocked.getMe.mockRejectedValue(new Error('401'));
    await renderProbe();
    expect(await screen.findByText('sem usuario')).toBeOnTheScreen();
    expect(mocked.deleteItem).toHaveBeenCalledWith('entre-aulas-token');
    expect(mocked.setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it('signIn saves the token with SecureStore and loads the user from /me', async () => {
    await renderProbe();
    await screen.findByText('sem usuario');
    await fireEvent.press(screen.getByText('entrar'));
    expect(await screen.findByText('Ana')).toBeOnTheScreen();
    expect(mocked.signIn).toHaveBeenCalledWith('ana@escola.com.br', 'senha-de-teste-com-15');
    expect(mocked.setItem).toHaveBeenCalledWith('entre-aulas-token', 'token-123');
    expect(mocked.setAuthToken).toHaveBeenCalledWith('token-123');
  });

  it('signOut clears the token even if the API call fails', async () => {
    mocked.getItem.mockResolvedValue('token-salvo');
    mocked.signOut.mockRejectedValue(new Error('offline'));
    await renderProbe();
    await screen.findByText('Ana');
    await fireEvent.press(screen.getByText('sair'));
    expect(await screen.findByText('sem usuario')).toBeOnTheScreen();
    expect(mocked.deleteItem).toHaveBeenCalledWith('entre-aulas-token');
    expect(mocked.setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it('the unauthorized handler clears the session and shows an Alert that the session expired', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mocked.getItem.mockResolvedValue('token-salvo');
    await renderProbe();
    await screen.findByText('Ana');

    // Pega a funcao que o AuthProvider registrou no cliente da API e a dispara.
    const handler = mocked.setUnauthorizedHandler.mock.calls.at(-1)?.[0] as () => void;
    await act(async () => {
      handler();
    });

    expect(await screen.findByText('sem usuario')).toBeOnTheScreen();
    expect(mocked.deleteItem).toHaveBeenCalledWith('entre-aulas-token');
    expect(alert).toHaveBeenCalledWith('Sessão expirada', 'Entre novamente para continuar.');
  });
});
