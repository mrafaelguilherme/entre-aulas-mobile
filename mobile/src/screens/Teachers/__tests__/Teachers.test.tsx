import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { teachersApi } from '../../../api/people';
import { useAuth } from '../../../contexts/AuthContext';
import { usePendingInvites } from '../../../contexts/PendingInvitesContext';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Paginated, Person, SessionUser } from '../../../types';
import { TeachersScreen } from '../index';

jest.mock('../../../api/people');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../contexts/PendingInvitesContext', () => ({ usePendingInvites: jest.fn() }));

const mocked = {
  list: teachersApi.list as jest.Mock,
  approve: teachersApi.approve as jest.Mock,
  reject: teachersApi.reject as jest.Mock,
  remove: teachersApi.remove as jest.Mock,
};
const reloadPending = jest.fn();

const master: Person = {
  id: 'm1',
  name: 'Master',
  email: 'master@entreaulas.com.br',
  role: 'master',
  status: 'active',
  mustChangePassword: false,
  invitedBy: null,
};
const ana: Person = {
  ...master,
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
};
const carlos: Person = {
  ...ana,
  id: 't2',
  name: 'Professor Carlos Lima',
  email: 'carlos@escola.com.br',
};
const marina: Person = {
  ...ana,
  id: 't3',
  name: 'Marina Alves',
  email: 'marina@escola.com.br',
  status: 'pending',
  invitedBy: 't1',
};

function pageOf(items: Person[], total = items.length): Paginated<Person> {
  return { items, page: 1, limit: 20, total };
}

function session(person: Person) {
  const user: SessionUser = { ...person };
  (useAuth as jest.Mock).mockReturnValue({
    user,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.list.mockResolvedValue(pageOf([marina, master, ana, carlos]));
  mocked.approve.mockResolvedValue({ ...marina, status: 'active' });
  mocked.reject.mockResolvedValue(undefined);
  mocked.remove.mockResolvedValue(undefined);
  (usePendingInvites as jest.Mock).mockReturnValue({ count: 1, reload: reloadPending });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('TeachersScreen', () => {
  it('lists teachers with Carregar mais, using pagination', async () => {
    session(ana);
    mocked.list.mockResolvedValue(pageOf([master, ana, carlos], 25));
    await renderScreen(TeachersScreen);
    expect(await screen.findByText('Professor Carlos Lima')).toBeOnTheScreen();
    expect(mocked.list).toHaveBeenCalledWith(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(mocked.list).toHaveBeenCalledWith(2));
  });

  it('pending accounts appear with Aceitar and Recusar for the master', async () => {
    session(master);
    await renderScreen(TeachersScreen);
    expect(await screen.findByText('Marina Alves')).toBeOnTheScreen();
    expect(screen.getByText(/Convite pendente/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aceitar Marina Alves' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Recusar Marina Alves' })).toBeEnabled();
  });

  it('a common teacher sees pending accounts without Aceitar and Recusar', async () => {
    session(ana);
    await renderScreen(TeachersScreen);
    expect(await screen.findByText('Marina Alves')).toBeOnTheScreen();
    expect(screen.getByText(/Aguardando o aceite do master/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Aceitar Marina Alves' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Recusar Marina Alves' })).not.toBeOnTheScreen();
  });

  it('Aceitar is blocked while sending and updates the list and the badge', async () => {
    session(master);
    let finish: (person: Person) => void = () => {};
    mocked.approve.mockReturnValueOnce(new Promise<Person>((resolve) => (finish = resolve)));
    await renderScreen(TeachersScreen);
    const accept = await screen.findByRole('button', { name: 'Aceitar Marina Alves' });
    await fireEvent.press(accept);
    expect(accept).toBeBusy();
    await fireEvent.press(accept);
    expect(mocked.approve).toHaveBeenCalledTimes(1);

    mocked.list.mockResolvedValue(pageOf([master, ana, carlos, { ...marina, status: 'active' }]));
    finish({ ...marina, status: 'active' });
    await waitFor(() => expect(screen.queryByText(/Convite pendente/)).not.toBeOnTheScreen());
    expect(mocked.list).toHaveBeenCalledTimes(2);
    expect(reloadPending).toHaveBeenCalled();
  });

  it('for a common teacher, another teacher has no Editar and no Excluir, with the note', async () => {
    session(ana);
    await renderScreen(TeachersScreen);
    await screen.findByText('Professor Carlos Lima');
    expect(
      screen.queryByRole('button', { name: 'Editar Professor Carlos Lima' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Excluir Professor Carlos Lima' }),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByText('Só o master pode alterar outro professor.').length).toBeGreaterThan(
      0,
    );
  });

  it('a common teacher can edit their own record; Excluir is not offered', async () => {
    session(ana);
    await renderScreen(TeachersScreen);
    await screen.findByText('Professora Ana Silva');
    expect(screen.getByRole('button', { name: 'Editar Professora Ana Silva' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Excluir Professora Ana Silva' }),
    ).not.toBeOnTheScreen();
  });

  it('the master can edit and delete, but has no Excluir on their own record', async () => {
    session(master);
    await renderScreen(TeachersScreen);
    await screen.findByText('Professor Carlos Lima');
    expect(screen.getByRole('button', { name: 'Editar Professor Carlos Lima' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Excluir Professor Carlos Lima' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Editar Master' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Excluir Master' })).not.toBeOnTheScreen();
  });

  it('Excluir and Recusar ask for confirmation', async () => {
    session(master);
    await renderScreen(TeachersScreen);
    await screen.findByText('Professor Carlos Lima');

    await fireEvent.press(screen.getByRole('button', { name: 'Excluir Professor Carlos Lima' }));
    expect(mocked.remove).not.toHaveBeenCalled();
    let alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alert?.[0]).toBe('Excluir professor');
    await alert?.[2].find((button: { text: string }) => button.text === 'Excluir').onPress();
    expect(mocked.remove).toHaveBeenCalledWith('t2');

    await fireEvent.press(screen.getByRole('button', { name: 'Recusar Marina Alves' }));
    expect(mocked.reject).not.toHaveBeenCalled();
    alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alert?.[0]).toBe('Recusar convite');
    await alert?.[2].find((button: { text: string }) => button.text === 'Recusar').onPress();
    expect(mocked.reject).toHaveBeenCalledWith('t3');
  });

  it('Cadastrar professor opens PersonEditor with role teacher', async () => {
    session(ana);
    await renderScreen(TeachersScreen, {
      routes: {
        PersonEditor: ({ route }: { route: { params: { role: string; id?: string } } }) => (
          <Text>{`Editor ${route.params.role} ${route.params.id ?? 'novo'}`}</Text>
        ),
      },
    });
    await screen.findByText('Professora Ana Silva');
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar professor' }));
    expect(await screen.findByText('Editor teacher novo')).toBeOnTheScreen();
  });
});
