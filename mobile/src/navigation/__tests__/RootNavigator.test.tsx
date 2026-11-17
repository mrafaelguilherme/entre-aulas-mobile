import { render, screen } from '@testing-library/react-native';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingInvites } from '../../contexts/PendingInvitesContext';
import { SessionUser } from '../../types';
import { navigationRef, RootNavigator } from '../RootNavigator';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../contexts/PendingInvitesContext', () => ({ usePendingInvites: jest.fn() }));
// A primeira aba fica vazia: este teste olha a navegacao, nao a lista de posts.
jest.mock('../../screens/PostsList', () => ({ PostsListScreen: () => null }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedPending = usePendingInvites as jest.Mock;

// Simula quem esta logado. null e um visitante.
function session(user: Partial<SessionUser> | null, loading = false) {
  mockedUseAuth.mockReturnValue({
    loading,
    user: user
      ? {
          id: 'u1',
          name: 'Pessoa',
          email: 'pessoa@escola.com.br',
          role: 'student',
          status: 'active',
          mustChangePassword: false,
          ...user,
        }
      : null,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

// Os botoes da barra inferior sao os unicos com o estado "selected".
function tabNames() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.props.accessibilityState?.selected !== undefined)
    .map((tab) => tab.props.accessibilityLabel);
}

function routeNames() {
  return navigationRef.getRootState()?.routeNames;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPending.mockReturnValue({ count: 0, reload: jest.fn() });
});

describe('RootNavigator', () => {
  it('shows only a progress indicator while the session loads', async () => {
    session(null, true);
    await render(<RootNavigator />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('a visitor sees the Posts and Entrar tabs', async () => {
    session(null);
    await render(<RootNavigator />);
    expect(tabNames()).toEqual(['Posts', 'Entrar']);
  });

  it('renders the tabs of the logged-in profile', async () => {
    session({ role: 'teacher' });
    await render(<RootNavigator />);
    expect(tabNames()).toEqual(['Posts', 'Gerenciar', 'Professores', 'Alunos', 'Conta']);
  });

  it('a student cannot navigate to PostEditor: the route is not registered', async () => {
    session({ role: 'student' });
    await render(<RootNavigator />);
    expect(routeNames()).toEqual(['Tabs', 'PostRead', 'ChangePassword']);
  });

  it('a teacher cannot navigate to DeletedAccounts: the route is not registered', async () => {
    session({ role: 'teacher' });
    await render(<RootNavigator />);
    expect(routeNames()).toEqual([
      'Tabs',
      'PostRead',
      'ChangePassword',
      'PostEditor',
      'PersonEditor',
    ]);
  });

  it('the master has every route, including DeletedAccounts', async () => {
    session({ role: 'master' });
    await render(<RootNavigator />);
    expect(routeNames()).toContain('DeletedAccounts');
  });

  it('mustChangePassword registers only ChangePassword, so there is no way back', async () => {
    session({ role: 'teacher', mustChangePassword: true });
    await render(<RootNavigator />);
    expect(routeNames()).toEqual(['ChangePassword']);
    expect(screen.getByRole('header', { name: 'Trocar senha' })).toBeOnTheScreen();
  });

  it('the Professores tab shows the pending count for the master', async () => {
    mockedPending.mockReturnValue({ count: 3, reload: jest.fn() });
    session({ role: 'master' });
    await render(<RootNavigator />);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('a common teacher never sees the pending count', async () => {
    mockedPending.mockReturnValue({ count: 3, reload: jest.fn() });
    session({ role: 'teacher' });
    await render(<RootNavigator />);
    expect(screen.queryByText('3')).not.toBeOnTheScreen();
  });

  it('after the first-access password change, the app restarts on the tabs', async () => {
    session({ role: 'student', mustChangePassword: true });
    await render(<RootNavigator />);
    expect(navigationRef.getCurrentRoute()?.name).toBe('ChangePassword');

    session({ role: 'student', mustChangePassword: false });
    await screen.rerender(<RootNavigator />);
    // getCurrentRoute devolve a tela mais interna: a aba Posts, dentro de Tabs.
    expect(navigationRef.getCurrentRoute()?.name).toBe('Posts');
  });
});
