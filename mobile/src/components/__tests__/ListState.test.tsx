import { fireEvent, render, screen } from '@testing-library/react-native';
import { ListState } from '../ListState';

describe('ListState', () => {
  it('loading shows a progress indicator', async () => {
    await render(<ListState status="loading" />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('error shows the message and "Tentar de novo", which calls onRetry', async () => {
    const onRetry = jest.fn();
    await render(
      <ListState status="error" message="Não foi possível conectar à API." onRetry={onRetry} />,
    );
    expect(screen.getByText('Não foi possível conectar à API.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty shows the empty message and never the error', async () => {
    await render(
      <ListState status="empty" emptyMessage="Nenhum post encontrado." message="erro qualquer" />,
    );
    expect(screen.getByText('Nenhum post encontrado.')).toBeOnTheScreen();
    expect(screen.queryByText('erro qualquer')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
