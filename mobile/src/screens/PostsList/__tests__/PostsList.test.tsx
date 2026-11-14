import { fireEvent, screen } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { Text } from 'react-native';
import { listPosts, searchPosts } from '../../../api/posts';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Paginated, Post } from '../../../types';
import { PostsListScreen } from '../index';

jest.mock('../../../api/posts');

const mockedList = listPosts as jest.Mock;
const mockedSearch = searchPosts as jest.Mock;

const posts: Post[] = [
  {
    id: 'p1',
    title: 'Como escrever uma boa redação',
    content: 'A redação dissertativa pede que você defenda um ponto de vista.',
    author: 'Professora Ana Silva',
    authorId: 't1',
  },
  {
    id: 'p2',
    title: 'Função do primeiro grau',
    content: 'A função do primeiro grau tem a forma f(x) = ax + b.',
    author: 'Professor Carlos Lima',
    authorId: 't2',
  },
];

function pageOf(items: Post[]): Paginated<Post> {
  return { items, page: 1, limit: 20, total: items.length };
}

// Tela de apoio: mostra o id recebido, para provar a navegacao.
function PostReadStub({ route }: { route: { params: { id: string } } }) {
  return <Text>{`Leitura ${route.params.id}`}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue(pageOf(posts));
  mockedSearch.mockResolvedValue(pageOf([posts[0]]));
});

describe('PostsListScreen', () => {
  it('shows title, author and the content with numberOfLines 3', async () => {
    await renderScreen(PostsListScreen);
    expect(await screen.findByText('Como escrever uma boa redação')).toBeOnTheScreen();
    expect(screen.getByText('Professora Ana Silva')).toBeOnTheScreen();
    expect(screen.getByText(posts[0].content)).toHaveProp('numberOfLines', 3);
    expect(mockedList).toHaveBeenCalledWith(1);
  });

  it('opens the post when a row is pressed', async () => {
    await renderScreen(PostsListScreen, { routes: { PostRead: PostReadStub } });
    await fireEvent.press(await screen.findByText('Função do primeiro grau'));
    expect(await screen.findByText('Leitura p2')).toBeOnTheScreen();
  });

  it('searching trims the term and calls searchPosts', async () => {
    await renderScreen(PostsListScreen);
    await screen.findByText('Função do primeiro grau');
    const field = screen.getByPlaceholderText('Buscar por palavra-chave');
    await fireEvent.changeText(field, '  redação ');
    await fireEvent(field, 'submitEditing');
    expect(mockedSearch).toHaveBeenCalledWith('redação', 1);
    expect(await screen.findByText('Como escrever uma boa redação')).toBeOnTheScreen();
    expect(screen.queryByText('Função do primeiro grau')).not.toBeOnTheScreen();
  });

  it('a term with only spaces calls listPosts, not searchPosts', async () => {
    await renderScreen(PostsListScreen);
    await screen.findByText('Função do primeiro grau');
    const field = screen.getByPlaceholderText('Buscar por palavra-chave');
    await fireEvent.changeText(field, '   ');
    await fireEvent(field, 'submitEditing');
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(mockedList).toHaveBeenCalledTimes(2);
  });

  it('shows an error with retry when the API fails', async () => {
    mockedList.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    await renderScreen(PostsListScreen);
    expect(await screen.findByText('Não foi possível conectar à API.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Função do primeiro grau')).toBeOnTheScreen();
  });

  it('shows "Nenhum post encontrado." when the search is empty', async () => {
    mockedSearch.mockResolvedValue(pageOf([]));
    await renderScreen(PostsListScreen);
    await screen.findByText('Função do primeiro grau');
    const field = screen.getByPlaceholderText('Buscar por palavra-chave');
    await fireEvent.changeText(field, 'química');
    await fireEvent(field, 'submitEditing');
    expect(await screen.findByText('Nenhum post encontrado.')).toBeOnTheScreen();
  });
});
