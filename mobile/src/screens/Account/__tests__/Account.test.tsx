import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { renderScreen } from '../../../test-utils/renderScreen';
import { SessionUser } from '../../../types';
import { AccountScreen } from '../index';

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const signOut = jest.fn();

function session(user: Partial<SessionUser>) {
  (useAuth as jest.Mock).mockReturnValue({
    loading: false,
    signIn: jest.fn(),
    signOut,
    user: {
      id: 't1',
      name: 'Professora Ana Silva',
      email: 'ana@escola.com.br',
      role: 'teacher',
      status: 'active',
      mustChangePassword: false,
      ...user,
    },
  });
}

beforeEach(() => jest.clearAllMocks());

describe('AccountScreen', () => {
  it('shows name, email, Trocar senha and Sair', async () => {
    session({});
    await renderScreen(AccountScreen);
    expect(screen.getByText('Professora Ana Silva')).toBeOnTheScreen();
    expect(screen.getByText('ana@escola.com.br')).toBeOnTheScreen();
    expect(screen.getByText('Perfil: Professor(a)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeOnTheScreen();
  });

  it('Sair calls signOut', async () => {
    session({});
    await renderScreen(AccountScreen);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('Trocar senha opens the ChangePassword screen', async () => {
    session({});
    await renderScreen(AccountScreen, {
      routes: { ChangePassword: () => <Text>Tela de troca</Text> },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('Tela de troca')).toBeOnTheScreen();
  });

  it('only the master sees Contas excluídas', async () => {
    session({ role: 'teacher' });
    await renderScreen(AccountScreen);
    expect(screen.queryByRole('button', { name: 'Contas excluídas' })).not.toBeOnTheScreen();
  });

  it('the master sees Contas excluídas and it opens the screen', async () => {
    session({ role: 'master', name: 'Master' });
    await renderScreen(AccountScreen, {
      routes: { DeletedAccounts: () => <Text>Tela de excluídas</Text> },
    });
    expect(screen.getByText('Perfil: Master')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Contas excluídas' }));
    expect(await screen.findByText('Tela de excluídas')).toBeOnTheScreen();
  });
});
