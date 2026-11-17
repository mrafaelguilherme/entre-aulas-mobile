import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { studentsApi } from '../../../api/people';
import { useAuth } from '../../../contexts/AuthContext';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Paginated, Person, SessionUser } from '../../../types';
import { StudentsScreen } from '../index';

jest.mock('../../../api/people');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mocked = {
  list: studentsApi.list as jest.Mock,
  remove: studentsApi.remove as jest.Mock,
};

const beatriz: Person = {
  id: 's1',
  name: 'Beatriz Souza',
  email: 'beatriz@escola.com.br',
  role: 'student',
  status: 'active',
  mustChangePassword: false,
  invitedBy: 't1',
};
const lia: Person = { ...beatriz, id: 's2', name: 'Lia Prado', email: 'lia@escola.com.br' };

const ana: SessionUser = {
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};
const master: SessionUser = { ...ana, id: 'm1', name: 'Master', role: 'master' };

function pageOf(items: Person[], total = items.length): Paginated<Person> {
  return { items, page: 1, limit: 20, total };
}

function session(user: SessionUser) {
  (useAuth as jest.Mock).mockReturnValue({
    user,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.list.mockResolvedValue(pageOf([beatriz, lia]));
  mocked.remove.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('StudentsScreen', () => {
  it('lists students with pagination, and Editar and Excluir enabled for a teacher', async () => {
    session(ana);
    mocked.list.mockResolvedValue(pageOf([beatriz, lia], 30));
    await renderScreen(StudentsScreen);
    expect(await screen.findByText('Beatriz Souza')).toBeOnTheScreen();
    expect(screen.getByText('lia@escola.com.br')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Editar Beatriz Souza' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Excluir Beatriz Souza' })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(mocked.list).toHaveBeenCalledWith(2));
  });

  it('the master also has Editar and Excluir enabled', async () => {
    session(master);
    await renderScreen(StudentsScreen);
    await screen.findByText('Lia Prado');
    expect(screen.getByRole('button', { name: 'Editar Lia Prado' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Excluir Lia Prado' })).toBeEnabled();
  });

  it('Excluir asks for confirmation and removes the student from the list', async () => {
    session(ana);
    await renderScreen(StudentsScreen);
    await screen.findByText('Beatriz Souza');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir Beatriz Souza' }));
    expect(mocked.remove).not.toHaveBeenCalled();

    const alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alert?.[0]).toBe('Excluir aluno');
    mocked.list.mockResolvedValue(pageOf([lia]));
    await alert?.[2].find((button: { text: string }) => button.text === 'Excluir').onPress();
    expect(mocked.remove).toHaveBeenCalledWith('s1');
    await waitFor(() => expect(screen.queryByText('Beatriz Souza')).not.toBeOnTheScreen());
  });

  it('Cadastrar aluno and Editar open PersonEditor with role student', async () => {
    session(ana);
    await renderScreen(StudentsScreen, {
      routes: {
        PersonEditor: ({ route }: { route: { params: { role: string; id?: string } } }) => (
          <Text>{`Editor ${route.params.role} ${route.params.id ?? 'novo'}`}</Text>
        ),
      },
    });
    await screen.findByText('Beatriz Souza');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Beatriz Souza' }));
    expect(await screen.findByText('Editor student s1')).toBeOnTheScreen();
  });

  it('shows the empty state', async () => {
    session(ana);
    mocked.list.mockResolvedValue(pageOf([]));
    await renderScreen(StudentsScreen);
    expect(await screen.findByText('Nenhum aluno cadastrado.')).toBeOnTheScreen();
  });
});
