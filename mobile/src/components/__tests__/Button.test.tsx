import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('has accessibilityRole button and minHeight 48', async () => {
    await render(<Button title="Entrar" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toHaveStyle({ minHeight: 48 });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Salvar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled sets accessibilityState disabled and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<Button title="Editar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Editar' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading ignores a second press and marks the button as busy', async () => {
    const onPress = jest.fn();
    await render(<Button title="Comentar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Comentar' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes the accessibility hint', async () => {
    await render(
      <Button title="Excluir" onPress={() => {}} accessibilityHint="Pede confirmação" />,
    );
    expect(screen.getByHintText('Pede confirmação')).toBeOnTheScreen();
  });
  it('compact is lower on the screen but keeps a 48 touch target with hitSlop', async () => {
    await render(<Button title="Editar" size="compact" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Editar' });
    expect(button).toHaveStyle({ minHeight: 40 });
    expect(button).toHaveProp('hitSlop', { top: 4, bottom: 4 });
  });
});
