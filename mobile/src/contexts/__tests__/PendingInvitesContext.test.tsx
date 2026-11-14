import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../AuthContext';
import { PendingInvitesProvider, usePendingInvites } from '../PendingInvitesContext';

jest.mock('../../api/client', () => ({ api: { get: jest.fn() } }));
jest.mock('../AuthContext', () => ({ useAuth: jest.fn() }));

const mockedGet = api.get as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;

function Probe() {
  const { count, reload } = usePendingInvites();
  return (
    <>
      <Text>{`pendentes: ${count}`}</Text>
      <Pressable onPress={() => reload()}>
        <Text>recarregar</Text>
      </Pressable>
    </>
  );
}

function renderProbe() {
  return render(
    <PendingInvitesProvider>
      <Probe />
    </PendingInvitesProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue({ data: { items: [], page: 1, limit: 1, total: 2 } });
});

describe('PendingInvitesProvider', () => {
  it('the master gets the pending total from /teachers?status=pending', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'm1', role: 'master' } });
    await renderProbe();
    expect(await screen.findByText('pendentes: 2')).toBeOnTheScreen();
    expect(mockedGet).toHaveBeenCalledWith('/teachers', {
      params: { status: 'pending', limit: 1 },
    });
  });

  it('a teacher never asks the API and sees 0', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 't1', role: 'teacher' } });
    await renderProbe();
    expect(await screen.findByText('pendentes: 0')).toBeOnTheScreen();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('reload asks again and updates the number', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'm1', role: 'master' } });
    await renderProbe();
    await screen.findByText('pendentes: 2');
    mockedGet.mockResolvedValue({ data: { items: [], page: 1, limit: 1, total: 0 } });
    await act(() => fireEvent.press(screen.getByText('recarregar')));
    expect(await screen.findByText('pendentes: 0')).toBeOnTheScreen();
  });

  it('an API failure keeps the previous number', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'm1', role: 'master' } });
    await renderProbe();
    await screen.findByText('pendentes: 2');
    mockedGet.mockRejectedValue(new Error('offline'));
    await act(() => fireEvent.press(screen.getByText('recarregar')));
    expect(screen.getByText('pendentes: 2')).toBeOnTheScreen();
  });
});
