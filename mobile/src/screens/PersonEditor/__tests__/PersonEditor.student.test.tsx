import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { studentsApi, teachersApi } from '../../../api/people';
import { useAuth } from '../../../contexts/AuthContext';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Person, SessionUser } from '../../../types';
import { PersonEditorScreen } from '../index';

jest.mock('../../../api/people');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mocked = {
  get: studentsApi.get as jest.Mock,
  create: studentsApi.create as jest.Mock,
  teacherGet: teachersApi.get as jest.Mock,
};

const ana: SessionUser = {
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};
const master: SessionUser = { ...ana, id: 'm1', name: 'Master', role: 'master' };

const beatriz: Person = {
  id: 's1',
  name: 'Beatriz Souza',
  email: 'beatriz@escola.com.br',
  role: 'student',
  status: 'active',
  mustChangePassword: false,
  invitedBy: 't1',
};

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
  mocked.get.mockResolvedValue(beatriz);
  mocked.create.mockResolvedValue({ ...beatriz, id: 's9', mustChangePassword: true });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('PersonEditorScreen (student)', () => {
  it('with role student creates a student with an initial password', async () => {
    session(ana);
    await renderScreen(PersonEditorScreen, { params: { role: 'student' } });
    expect(screen.getByRole('header', { name: 'Cadastrar aluno' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Caio Mendes');
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'caio@escola.com.br');
    await fireEvent.changeText(screen.getByLabelText('Senha inicial'), 'senha-inicial-com-15-c');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(mocked.create).toHaveBeenCalledWith({
        name: 'Caio Mendes',
        email: 'caio@escola.com.br',
        password: 'senha-inicial-com-15-c',
      }),
    );
    expect(mocked.teacherGet).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Conta criada', expect.any(String));
  });

  it('when editing a student, a teacher sees no password field and no Redefinir senha', async () => {
    session(ana);
    await renderScreen(PersonEditorScreen, { params: { role: 'student', id: 's1' } });
    expect(await screen.findByRole('header', { name: 'Editar aluno' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Beatriz Souza')).toBeOnTheScreen();
    expect(mocked.get).toHaveBeenCalledWith('s1');
    expect(screen.queryByLabelText('Senha inicial')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Redefinir senha' })).not.toBeOnTheScreen();
  });

  it('when editing a student, the master sees Redefinir senha', async () => {
    session(master);
    await renderScreen(PersonEditorScreen, { params: { role: 'student', id: 's1' } });
    await screen.findByDisplayValue('Beatriz Souza');
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeOnTheScreen();
  });
});
