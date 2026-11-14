import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../TextField';

describe('TextField', () => {
  it('links the label to the input and passes the typed text up', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" value="" onChangeText={onChangeText} />);
    const input = screen.getByLabelText('E-mail');
    await fireEvent.changeText(input, 'ana@escola.com.br');
    expect(onChangeText).toHaveBeenCalledWith('ana@escola.com.br');
  });

  it('shows the error as text, linked to the field', async () => {
    await render(
      <TextField label="Senha" value="" onChangeText={() => {}} error="Informe a senha." />,
    );
    expect(screen.getByText('Informe a senha.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Senha')).toHaveAccessibleName('Senha');
    expect(screen.getByHintText('Informe a senha.')).toBeOnTheScreen();
  });

  it('shows no error text when there is no error', async () => {
    await render(<TextField label="Nome" value="Ana" onChangeText={() => {}} />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('a read-only field is not editable', async () => {
    await render(<TextField label="Autor" value="Ana" onChangeText={() => {}} editable={false} />);
    expect(screen.getByLabelText('Autor')).toBeDisabled();
  });
});
