import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { teachersApi, usersApi } from '../../../api/people';
import { useAuth } from '../../../contexts/AuthContext';
import { httpError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Person, SessionUser } from '../../../types';
import { PersonEditorScreen } from '../index';

jest.mock('../../../api/people');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mocked = {
  get: teachersApi.get as jest.Mock,
  create: teachersApi.create as jest.Mock,
  update: teachersApi.update as jest.Mock,
  resetPassword: usersApi.resetPassword as jest.Mock,
};

const master: SessionUser = {
  id: 'm1',
  name: 'Master',
  email: 'master@entreaulas.com.br',
  role: 'master',
  status: 'active',
  mustChangePassword: false,
};
const ana: SessionUser = {
  ...master,
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
};

const carlos: Person = {
  id: 't2',
  name: 'Professor Carlos Lima',
  email: 'carlos@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
  invitedBy: null,
};

const PASSWORD = 'senha-inicial-com-15-c';

function session(user: SessionUser) {
  (useAuth as jest.Mock).mockReturnValue({
    user,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

async function fill(name: string, email: string, password?: string) {
  await fireEvent.changeText(screen.getByLabelText('Nome'), name);
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  if (password !== undefined) {
    await fireEvent.changeText(screen.getByLabelText('Senha inicial'), password);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.get.mockResolvedValue(carlos);
  mocked.create.mockResolvedValue({ ...carlos, id: 't9', status: 'pending' });
  mocked.update.mockResolvedValue(carlos);
  mocked.resetPassword.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('PersonEditorScreen (teacher)', () => {
  it('requires a name, a valid email and, when creating, a password with 15 to 128 chars', async () => {
    session(ana);
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher' } });
    expect(screen.getByRole('header', { name: 'Cadastrar professor' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe o nome.')).toBeOnTheScreen();
    expect(screen.getByText('Informe o e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a senha inicial.')).toBeOnTheScreen();

    await fill('M', 'marina@', 'curta');
    expect(await screen.findByText('O nome precisa ter ao menos 2 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('Informe um e-mail válido.')).toBeOnTheScreen();
    expect(screen.getByText('A senha precisa ter ao menos 15 caracteres.')).toBeOnTheScreen();
    expect(mocked.create).not.toHaveBeenCalled();
  });

  it('a teacher sees "Convite enviado. Aguarde o aceite do master." after sending', async () => {
    session(ana);
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher' } });
    await fill('Marina Alves', ' Marina@Escola.com.br ', PASSWORD);
    await waitFor(() =>
      expect(mocked.create).toHaveBeenCalledWith({
        name: 'Marina Alves',
        email: 'marina@escola.com.br',
        password: PASSWORD,
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Convite enviado',
      'Aguarde o aceite do master. Depois, a pessoa entra com a senha inicial.',
    );
  });

  it('the master sees the account as active after sending', async () => {
    session(master);
    mocked.create.mockResolvedValue({ ...carlos, id: 't9', status: 'active' });
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher' } });
    await fill('Marina Alves', 'marina@escola.com.br', PASSWORD);
    await waitFor(() => expect(mocked.create).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith(
      'Conta criada',
      'A pessoa já pode entrar com a senha inicial e vai trocá-la no primeiro acesso.',
    );
  });

  it('when editing, loads the person, has no password field and saves with update', async () => {
    session(ana);
    mocked.get.mockResolvedValue({
      ...carlos,
      id: 't1',
      name: 'Professora Ana Silva',
      email: 'ana@escola.com.br',
    });
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher', id: 't1' } });
    expect(await screen.findByRole('header', { name: 'Editar professor' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Professora Ana Silva')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Senha inicial')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Redefinir senha' })).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Silva');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(mocked.update).toHaveBeenCalledWith('t1', {
        name: 'Ana Silva',
        email: 'ana@escola.com.br',
      }),
    );
    expect(mocked.create).not.toHaveBeenCalled();
  });

  it('the master sees Redefinir senha on another account, and it needs 15 chars', async () => {
    session(master);
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher', id: 't2' } });
    await screen.findByDisplayValue('Professor Carlos Lima');
    const field = screen.getByLabelText('Nova senha provisória');
    await fireEvent.changeText(field, 'curta');
    await fireEvent.press(screen.getByRole('button', { name: 'Redefinir senha' }));
    expect(
      await screen.findByText('A senha precisa ter ao menos 15 caracteres.'),
    ).toBeOnTheScreen();
    expect(mocked.resetPassword).not.toHaveBeenCalled();

    await fireEvent.changeText(field, 'provisoria-com-15-chars');
    await fireEvent.press(screen.getByRole('button', { name: 'Redefinir senha' }));
    await waitFor(() =>
      expect(mocked.resetPassword).toHaveBeenCalledWith('t2', 'provisoria-com-15-chars'),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Senha redefinida',
      'A pessoa entra com a senha provisória e troca no próximo acesso.',
    );
  });

  it('a 409 shows "Este e-mail não está disponível."', async () => {
    session(master);
    mocked.create.mockRejectedValue(httpError(409, true));
    await renderScreen(PersonEditorScreen, { params: { role: 'teacher' } });
    await fill('Marina Alves', 'ana@escola.com.br', PASSWORD);
    expect(await screen.findByText('Este e-mail não está disponível.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toHaveDisplayValue('Marina Alves');
  });
});
