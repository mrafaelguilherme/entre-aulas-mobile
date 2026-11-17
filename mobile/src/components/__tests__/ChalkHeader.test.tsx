import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ChalkHeader } from '../ChalkHeader';

// A lousa pergunta a navegacao se existe tela anterior. Aqui a resposta e controlada.
// O nome comeca com "mock" porque o Jest so deixa a fabrica do mock usar variaveis assim.
const mockParent = { canGoBack: jest.fn(), goBack: jest.fn() };
const mockNavigation = {
  canGoBack: jest.fn(),
  goBack: jest.fn(),
  // undefined = a tela esta na pilha raiz; um objeto = a tela esta dentro das abas.
  getParent: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('ChalkHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.getParent.mockReturnValue(undefined);
  });

  it('shows the app name when there is no title', async () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    await render(<ChalkHeader />);
    expect(screen.getByRole('header', { name: 'Entre Aulas' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeOnTheScreen();
  });

  it('shows the title, the right slot and the children', async () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    await render(
      <ChalkHeader title="Professores" right={<Text>Cadastrar</Text>}>
        <Text>filho</Text>
      </ChalkHeader>,
    );
    expect(screen.getByRole('header', { name: 'Professores' })).toBeOnTheScreen();
    expect(screen.getByText('Cadastrar')).toBeOnTheScreen();
    expect(screen.getByText('filho')).toBeOnTheScreen();
  });

  it('shows Voltar only when navigation.canGoBack() is true, and it goes back', async () => {
    mockNavigation.canGoBack.mockReturnValue(true);
    await render(<ChalkHeader title="Leitura" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('inside the tabs, asks the parent stack and hides Voltar when it cannot go back', async () => {
    mockNavigation.canGoBack.mockReturnValue(true);
    mockParent.canGoBack.mockReturnValue(false);
    mockNavigation.getParent.mockReturnValue(mockParent);
    await render(<ChalkHeader />);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeOnTheScreen();
  });
});
