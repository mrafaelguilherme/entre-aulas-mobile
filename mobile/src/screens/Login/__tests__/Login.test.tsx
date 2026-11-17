import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { httpError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { LoginScreen } from '../index';

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const signIn = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  (useAuth as jest.Mock).mockReturnValue({
    user: null,
    loading: false,
    signIn,
    signOut: jest.fn(),
  });
});

async function fillAndSubmit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginScreen', () => {
  it('requires a valid email and a password', async () => {
    await renderScreen(LoginScreen);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe o e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a senha.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed email and the password', async () => {
    await renderScreen(LoginScreen);
    await fillAndSubmit('  ana@escola.com.br ', 'senha-de-teste-com-15');
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('ana@escola.com.br', 'senha-de-teste-com-15'),
    );
  });

  it('a 401 shows "E-mail ou senha inválidos."', async () => {
    signIn.mockRejectedValue(httpError(401));
    await renderScreen(LoginScreen);
    await fillAndSubmit('ana@escola.com.br', 'senha-errada-com-15-c');
    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeOnTheScreen();
  });

  it('a 429 shows "Muitas tentativas. Aguarde e tente de novo."', async () => {
    signIn.mockRejectedValue(httpError(429));
    await renderScreen(LoginScreen);
    await fillAndSubmit('ana@escola.com.br', 'senha-de-teste-com-15');
    expect(
      await screen.findByText('Muitas tentativas. Aguarde e tente de novo.'),
    ).toBeOnTheScreen();
  });

  it('the password field is hidden and autocapitalize is off for the email', async () => {
    await renderScreen(LoginScreen);
    expect(screen.getByLabelText('Senha')).toHaveProp('secureTextEntry', true);
    expect(screen.getByLabelText('E-mail')).toHaveProp('autoCapitalize', 'none');
    expect(screen.getByLabelText('E-mail')).toHaveProp('keyboardType', 'email-address');
  });

  it('the Entrar button is blocked while sending', async () => {
    let finish: () => void = () => {};
    signIn.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
    await renderScreen(LoginScreen);
    await fillAndSubmit('ana@escola.com.br', 'senha-de-teste-com-15');
    const button = screen.getByRole('button', { name: 'Entrar' });
    await waitFor(() => expect(button).toBeBusy());
    await fireEvent.press(button);
    expect(signIn).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeBusy());
  });
});
