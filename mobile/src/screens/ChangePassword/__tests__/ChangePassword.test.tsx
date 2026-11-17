import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { changePassword } from '../../../api/auth';
import { useAuth } from '../../../contexts/AuthContext';
import { httpError, networkError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { ChangePasswordScreen } from '../index';

jest.mock('../../../api/auth');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedChangePassword = changePassword as jest.Mock;
const signIn = jest.fn();
const signOut = jest.fn();

function session(mustChangePassword: boolean) {
  (useAuth as jest.Mock).mockReturnValue({
    loading: false,
    signIn,
    signOut,
    user: {
      id: 's2',
      name: 'Lia Prado',
      email: 'lia@escola.com.br',
      role: 'student',
      status: 'active',
      mustChangePassword,
    },
  });
}

const CURRENT = 'senha-provisoria-15';
const NEXT = 'minha-senha-nova-forte';

async function fill(current: string, next: string, confirmation: string) {
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), current);
  await fireEvent.changeText(screen.getByLabelText('Nova senha'), next);
  await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), confirmation);
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedChangePassword.mockResolvedValue(undefined);
  signIn.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('ChangePasswordScreen', () => {
  it('requires the current password, a new one with 15 to 128 chars and a matching confirmation', async () => {
    session(true);
    await renderScreen(ChangePasswordScreen);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe a senha atual.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a nova senha.')).toBeOnTheScreen();
    expect(screen.getByText('Confirme a nova senha.')).toBeOnTheScreen();

    await fill(CURRENT, 'curta', 'curta');
    expect(
      await screen.findByText('A nova senha precisa ter ao menos 15 caracteres.'),
    ).toBeOnTheScreen();

    await fill(CURRENT, NEXT, 'outra-coisa-diferente');
    expect(
      await screen.findByText('A confirmação precisa ser igual à nova senha.'),
    ).toBeOnTheScreen();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('a success calls signIn with the current email and the new password', async () => {
    session(true);
    await renderScreen(ChangePasswordScreen);
    await fill(CURRENT, NEXT, NEXT);
    await waitFor(() => expect(mockedChangePassword).toHaveBeenCalledWith(CURRENT, NEXT));
    expect(signIn).toHaveBeenCalledWith('lia@escola.com.br', NEXT);
    expect(Alert.alert).toHaveBeenCalledWith('Senha alterada', 'Sua nova senha já vale.');
  });

  it('a 400 says the current password does not match', async () => {
    session(false);
    mockedChangePassword.mockRejectedValue(httpError(400, true));
    await renderScreen(ChangePasswordScreen);
    await fill('senha-atual-errada', NEXT, NEXT);
    expect(await screen.findByText('A senha atual não confere.')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('on the first access shows the hint and a Sair button', async () => {
    session(true);
    await renderScreen(ChangePasswordScreen);
    expect(screen.getByText('Troque a senha provisória para continuar.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('a voluntary change shows no hint and no Sair', async () => {
    session(false);
    await renderScreen(ChangePasswordScreen);
    expect(screen.queryByText('Troque a senha provisória para continuar.')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeOnTheScreen();
  });

  it('the new password fields are hidden', async () => {
    session(false);
    await renderScreen(ChangePasswordScreen);
    expect(screen.getByLabelText('Senha atual')).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText('Nova senha')).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText('Nova senha')).toHaveProp('autoCapitalize', 'none');
  });

  it('if the new login fails, signs out and asks to log in with the new password', async () => {
    session(false);
    signIn.mockRejectedValue(networkError);
    await renderScreen(ChangePasswordScreen);
    await fill(CURRENT, NEXT, NEXT);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Senha alterada', 'Entre de novo com a senha nova.');
  });
});
