import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { usersApi } from '../../../api/people';
import { httpError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Paginated, Person } from '../../../types';
import { DeletedAccountsScreen } from '../index';

jest.mock('../../../api/people');

const mocked = {
  listDeleted: usersApi.listDeleted as jest.Mock,
  restore: usersApi.restore as jest.Mock,
};

const caio: Person = {
  id: 's3',
  name: 'Caio Mendes',
  email: 'caio@escola.com.br',
  role: 'student',
  status: 'deleted',
  mustChangePassword: false,
  invitedBy: 't1',
};
const carlos: Person = {
  ...caio,
  id: 't2',
  name: 'Professor Carlos Lima',
  email: 'carlos@escola.com.br',
  role: 'teacher',
};

function pageOf(items: Person[]): Paginated<Person> {
  return { items, page: 1, limit: 20, total: items.length };
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.listDeleted.mockResolvedValue(pageOf([caio, carlos]));
  mocked.restore.mockResolvedValue({ ...caio, status: 'active' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('DeletedAccountsScreen', () => {
  it('lists the accounts with their role, and Restaurar removes them from the list', async () => {
    await renderScreen(DeletedAccountsScreen);
    expect(await screen.findByText('Caio Mendes')).toBeOnTheScreen();
    expect(screen.getByText('caio@escola.com.br')).toBeOnTheScreen();
    expect(screen.getByText('Aluno(a)')).toBeOnTheScreen();
    expect(screen.getByText('carlos@escola.com.br')).toBeOnTheScreen();
    expect(screen.getByText('Professor(a)')).toBeOnTheScreen();
    expect(mocked.listDeleted).toHaveBeenCalledWith(1);

    mocked.listDeleted.mockResolvedValue(pageOf([carlos]));
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar Caio Mendes' }));
    expect(mocked.restore).toHaveBeenCalledWith('s3');
    await waitFor(() => expect(screen.queryByText('Caio Mendes')).not.toBeOnTheScreen());
  });

  it('shows the empty state', async () => {
    mocked.listDeleted.mockResolvedValue(pageOf([]));
    await renderScreen(DeletedAccountsScreen);
    expect(await screen.findByText('Nenhuma conta excluída.')).toBeOnTheScreen();
  });

  it('shows the error state with retry', async () => {
    mocked.listDeleted.mockRejectedValueOnce(httpError(500, true));
    await renderScreen(DeletedAccountsScreen);
    expect(await screen.findByText('Ocorreu um erro. Tente novamente.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Caio Mendes')).toBeOnTheScreen();
  });

  it('a failed restore keeps the list and warns', async () => {
    mocked.restore.mockRejectedValue(httpError(500, true));
    await renderScreen(DeletedAccountsScreen);
    await fireEvent.press(await screen.findByRole('button', { name: 'Restaurar Caio Mendes' }));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Não foi possível restaurar',
        'Ocorreu um erro. Tente novamente.',
      ),
    );
    expect(screen.getByText('Caio Mendes')).toBeOnTheScreen();
  });
});
