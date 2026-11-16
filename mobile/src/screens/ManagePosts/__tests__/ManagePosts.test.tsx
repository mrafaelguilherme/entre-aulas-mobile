import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { deletePost, listPosts } from '../../../api/posts';
import { useAuth } from '../../../contexts/AuthContext';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Paginated, Post, SessionUser } from '../../../types';
import { ManagePostsScreen } from '../index';

jest.mock('../../../api/posts');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedList = listPosts as jest.Mock;
const mockedDelete = deletePost as jest.Mock;

const anaPost: Post = {
  id: 'p1',
  title: 'Redação dissertativa',
  content: 'Como defender um ponto de vista.',
  author: 'Professora Ana Silva',
  authorId: 't1',
  createdAt: '2026-11-12T15:00:00.000Z',
};
const carlosPost: Post = {
  id: 'p2',
  title: 'Função do primeiro grau',
  content: 'f(x) = ax + b.',
  author: 'Professor Carlos Lima',
  authorId: 't2',
};

const ana: SessionUser = {
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};
const master: SessionUser = { ...ana, id: 'm1', name: 'Master', role: 'master' };

function pageOf(items: Post[]): Paginated<Post> {
  return { items, page: 1, limit: 20, total: items.length };
}

function session(user: SessionUser) {
  (useAuth as jest.Mock).mockReturnValue({
    user,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue(pageOf([anaPost, carlosPost]));
  mockedDelete.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('ManagePostsScreen', () => {
  it('lists every post, not only the logged-in user posts, with the date', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen);
    expect(await screen.findByText('Redação dissertativa')).toBeOnTheScreen();
    expect(screen.getByText('Função do primeiro grau')).toBeOnTheScreen();
    expect(screen.getByText('Professor Carlos Lima')).toBeOnTheScreen();
    expect(screen.getByText('12/11/2026')).toBeOnTheScreen();
    expect(mockedList).toHaveBeenCalledWith(1);
  });

  it('own post has Editar and Excluir enabled', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen);
    await screen.findByText('Redação dissertativa');
    expect(screen.getByRole('button', { name: 'Editar Redação dissertativa' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Excluir Redação dissertativa' })).toBeEnabled();
  });

  it('another teacher post has no Editar and no Excluir, with "Só quem criou o post pode editar."', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen);
    await screen.findByText('Função do primeiro grau');
    expect(
      screen.queryByRole('button', { name: 'Editar Função do primeiro grau' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Excluir Função do primeiro grau' }),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByText('Só quem criou o post pode editar.')).toHaveLength(1);
  });

  it('for the master, another teacher post has Excluir but no Editar', async () => {
    session(master);
    await renderScreen(ManagePostsScreen);
    await screen.findByText('Função do primeiro grau');
    expect(
      screen.queryByRole('button', { name: 'Editar Função do primeiro grau' }),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Excluir Função do primeiro grau' })).toBeEnabled();
    expect(screen.getAllByText('Só quem criou o post pode editar.')).toHaveLength(2);
  });

  it('Excluir asks for confirmation and only then calls deletePost', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen);
    await screen.findByText('Redação dissertativa');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir Redação dissertativa' }));
    expect(mockedDelete).not.toHaveBeenCalled();

    const alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alert?.[0]).toBe('Excluir post');
    mockedList.mockResolvedValue(pageOf([carlosPost]));
    const confirm = alert?.[2].find((button: { text: string }) => button.text === 'Excluir');
    await confirm.onPress();
    expect(mockedDelete).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.queryByText('Redação dissertativa')).not.toBeOnTheScreen());
  });

  it('Novo post opens the editor without an id, and Editar opens it with the id', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen, {
      routes: {
        PostEditor: ({ route }: { route: { params?: { id?: string } } }) => (
          <Text>{`Editor ${route.params?.id ?? 'novo'}`}</Text>
        ),
      },
    });
    await screen.findByText('Redação dissertativa');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Redação dissertativa' }));
    expect(await screen.findByText('Editor p1')).toBeOnTheScreen();
  });

  it('Novo post opens the editor without an id', async () => {
    session(ana);
    await renderScreen(ManagePostsScreen, {
      routes: {
        PostEditor: ({ route }: { route: { params?: { id?: string } } }) => (
          <Text>{`Editor ${route.params?.id ?? 'novo'}`}</Text>
        ),
      },
    });
    await screen.findByText('Redação dissertativa');
    await fireEvent.press(screen.getByRole('button', { name: 'Novo post' }));
    expect(await screen.findByText('Editor novo')).toBeOnTheScreen();
  });
});
