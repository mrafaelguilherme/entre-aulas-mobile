import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createPost, getPost, updatePost } from '../../../api/posts';
import { useAuth } from '../../../contexts/AuthContext';
import { httpError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Post, SessionUser } from '../../../types';
import { PostEditorScreen } from '../index';

jest.mock('../../../api/posts');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedGet = getPost as jest.Mock;
const mockedCreate = createPost as jest.Mock;
const mockedUpdate = updatePost as jest.Mock;

const ana: SessionUser = {
  id: 't1',
  name: 'Professora Ana Silva',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};

const carlosPost: Post = {
  id: 'p2',
  title: 'Função do primeiro grau',
  content: 'f(x) = ax + b.',
  author: 'Professor Carlos Lima',
  authorId: 't2',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({
    user: ana,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
  mockedGet.mockResolvedValue(carlosPost);
  mockedCreate.mockResolvedValue({ ...carlosPost, id: 'p9' });
  mockedUpdate.mockResolvedValue(carlosPost);
});

describe('PostEditorScreen', () => {
  it('requires a title up to 200 chars and a content up to 20000 chars', async () => {
    await renderScreen(PostEditorScreen);
    expect(screen.getByRole('header', { name: 'Novo post' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe o título.')).toBeOnTheScreen();
    expect(screen.getByText('Informe o conteúdo.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Título'), 'a'.repeat(201));
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), 'b'.repeat(20001));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O título pode ter até 200 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('O conteúdo pode ter até 20000 caracteres.')).toBeOnTheScreen();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('shows the author on the board, with the user name when creating', async () => {
    await renderScreen(PostEditorScreen);
    expect(screen.getByText('Autor: Professora Ana Silva')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Autor')).not.toBeOnTheScreen();
  });

  it('creating sends the trimmed title and content', async () => {
    await renderScreen(PostEditorScreen);
    await fireEvent.changeText(screen.getByLabelText('Título'), '  Feira de ciências ');
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), ' A feira acontece em abril. ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        title: 'Feira de ciências',
        content: 'A feira acontece em abril.',
      }),
    );
  });

  it('with an id, loads the current title, content and author, and saves with updatePost', async () => {
    await renderScreen(PostEditorScreen, { params: { id: 'p2' } });
    expect(await screen.findByRole('header', { name: 'Editar post' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Função do primeiro grau')).toBeOnTheScreen();
    expect(screen.getByLabelText('Conteúdo')).toHaveDisplayValue('f(x) = ax + b.');
    expect(screen.getByText('Autor: Professor Carlos Lima')).toBeOnTheScreen();
    expect(mockedGet).toHaveBeenCalledWith('p2');

    await fireEvent.changeText(screen.getByLabelText('Título'), 'Função afim');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('p2', {
        title: 'Função afim',
        content: 'f(x) = ax + b.',
      }),
    );
  });

  it('the Salvar button is blocked while sending', async () => {
    let finish: (post: Post) => void = () => {};
    mockedCreate.mockReturnValueOnce(new Promise<Post>((resolve) => (finish = resolve)));
    await renderScreen(PostEditorScreen);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Título');
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), 'Conteúdo');
    const button = screen.getByRole('button', { name: 'Salvar' });
    await fireEvent.press(button);
    await waitFor(() => expect(button).toBeBusy());
    await fireEvent.press(button);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    finish({ ...carlosPost, id: 'p9' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).not.toBeBusy());
  });

  it('a 403 keeps the text and shows the permission message', async () => {
    mockedUpdate.mockRejectedValue(httpError(403, true));
    await renderScreen(PostEditorScreen, { params: { id: 'p2' } });
    await screen.findByDisplayValue('Função do primeiro grau');
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Tentativa de alterar');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Você não tem permissão para esta ação.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Título')).toHaveDisplayValue('Tentativa de alterar');
  });

  it('shows an error with retry when the post fails to load', async () => {
    mockedGet.mockRejectedValueOnce(httpError(500, true));
    await renderScreen(PostEditorScreen, { params: { id: 'p2' } });
    expect(await screen.findByText('Ocorreu um erro. Tente novamente.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByDisplayValue('Função do primeiro grau')).toBeOnTheScreen();
  });
});
