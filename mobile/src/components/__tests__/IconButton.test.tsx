import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('is a button named by its label, with a 48 touch target through hitSlop', async () => {
    await render(
      <IconButton icon="create-outline" label="Editar Guia da feira" onPress={() => {}} />,
    );
    const button = screen.getByRole('button', { name: 'Editar Guia da feira' });
    expect(button).toHaveStyle({ width: 32, height: 32 });
    expect(button).toHaveProp('hitSlop', { top: 8, bottom: 8, left: 8, right: 8 });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="trash-outline" label="Excluir" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('loading marks the button as busy and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="trash-outline" label="Excluir" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes the accessibility hint', async () => {
    await render(
      <IconButton
        icon="trash-outline"
        label="Excluir"
        onPress={() => {}}
        accessibilityHint="Pede confirmação"
      />,
    );
    expect(screen.getByHintText('Pede confirmação')).toBeOnTheScreen();
  });
});
