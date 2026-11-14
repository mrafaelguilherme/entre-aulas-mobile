import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { createComment, deleteComment, listComments } from '../../../api/comments';
import { getPost } from '../../../api/posts';
import { useAuth } from '../../../contexts/AuthContext';
import { httpError, networkError } from '../../../test-utils/httpError';
import { renderScreen } from '../../../test-utils/renderScreen';
import { Comment, Paginated, Post, SessionUser } from '../../../types';
import { PostReadScreen } from '../index';

jest.mock('../../../api/posts');
jest.mock('../../../api/comments');
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const mockedGetPost = getPost as jest.Mock;
const mockedListComments = listComments as jest.Mock;
const mockedCreateComment = createComment as jest.Mock;
const mockedDeleteComment = deleteComment as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;

const post: Post = {
  id: 'p1',
  title: 'Guia da feira de ciências',
  content: 'A feira acontece no fim de abril.',
  author: 'Professora Ana Silva',
  authorId: 't1',
  createdAt: '2026-03-02T12:00:00.000Z',
};

const beatrizComment: Comment = {
  id: 'c1',
  postId: 'p1',
  content: 'Podemos usar materiais recicláveis?',
  author: 'Beatriz Souza',
  authorId: 's1',
};

const beatriz: SessionUser = {
  id: 's1',
  name: 'Beatriz Souza',
  email: 'beatriz@escola.com.br',
  role: 'student',
  status: 'active',
  mustChangePassword: false,
};

function pageOf(items: Comment[]): Paginated<Comment> {
  return { items, page: 1, limit: 20, total: items.length };
}

function session(user: SessionUser | null) {
  mockedUseAuth.mockReturnValue({ user, loading: false, signIn: jest.fn(), signOut: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPost.mockResolvedValue(post);
  mockedListComments.mockResolvedValue(pageOf([beatrizComment]));
  mockedCreateComment.mockResolvedValue({ ...beatrizComment, id: 'c2', content: 'Obrigada!' });
  mockedDeleteComment.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('PostReadScreen', () => {
  it('shows the title, author, date and full content', async () => {
    session(null);
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    expect(
      await screen.findByRole('header', { name: 'Guia da feira de ciências' }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Professora Ana Silva/)).toBeOnTheScreen();
    expect(screen.getByText(/2 de março de 2026/)).toBeOnTheScreen();
    expect(screen.getByText('A feira acontece no fim de abril.')).toBeOnTheScreen();
    expect(mockedGetPost).toHaveBeenCalledWith('p1');
  });

  it('lists the comments with author and content', async () => {
    session(null);
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    expect(await screen.findByText('Podemos usar materiais recicláveis?')).toBeOnTheScreen();
    expect(screen.getByText('Beatriz Souza')).toBeOnTheScreen();
    expect(mockedListComments).toHaveBeenCalledWith('p1', 1);
  });

  it('a guest sees "Entre para comentar" and no comment field', async () => {
    session(null);
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    expect(await screen.findByText('Entre para comentar.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Comentário')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Apagar' })).not.toBeOnTheScreen();
  });

  it('a logged-in user sees the field, and a sent comment appears in the list', async () => {
    session(beatriz);
    mockedListComments
      .mockResolvedValueOnce(pageOf([beatrizComment]))
      .mockResolvedValueOnce(
        pageOf([beatrizComment, { ...beatrizComment, id: 'c2', content: 'Obrigada!' }]),
      );
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    const field = await screen.findByLabelText('Comentário');
    await fireEvent.changeText(field, '  Obrigada!  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Comentar' }));
    expect(mockedCreateComment).toHaveBeenCalledWith('p1', 'Obrigada!');
    expect(await screen.findByText('Obrigada!')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comentário')).toHaveDisplayValue('');
  });

  it('an empty comment is not sent', async () => {
    session(beatriz);
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    await screen.findByLabelText('Comentário');
    await fireEvent.press(screen.getByRole('button', { name: 'Comentar' }));
    expect(mockedCreateComment).not.toHaveBeenCalled();
    expect(screen.getByText('Escreva algo antes de comentar.')).toBeOnTheScreen();
  });

  it('the Comentar button is blocked while sending', async () => {
    session(beatriz);
    let finish: (value: Comment) => void = () => {};
    mockedCreateComment.mockReturnValueOnce(new Promise<Comment>((resolve) => (finish = resolve)));
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    await fireEvent.changeText(await screen.findByLabelText('Comentário'), 'Oi');
    const button = screen.getByRole('button', { name: 'Comentar' });
    await fireEvent.press(button);
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(mockedCreateComment).toHaveBeenCalledTimes(1);
    finish({ ...beatrizComment, id: 'c9', content: 'Oi' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Comentar' })).not.toBeBusy());
  });

  it('Apagar appears only when canDeleteComment is true, and asks for confirmation', async () => {
    session(beatriz);
    mockedListComments.mockResolvedValue(
      pageOf([
        beatrizComment,
        { ...beatrizComment, id: 'c3', content: 'Sim, podem.', author: 'Ana', authorId: 't1' },
      ]),
    );
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    await screen.findByText('Podemos usar materiais recicláveis?');
    // So o proprio comentario da aluna tem Apagar.
    expect(screen.getAllByRole('button', { name: 'Apagar' })).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar' }));
    expect(mockedDeleteComment).not.toHaveBeenCalled();
    const alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alert?.[0]).toBe('Apagar comentário');
    // Confirma, como quem toca em "Apagar" na caixa de dialogo.
    const confirm = alert?.[2].find((button: { text: string }) => button.text === 'Apagar');
    await confirm.onPress();
    expect(mockedDeleteComment).toHaveBeenCalledWith('c1');
  });

  it('a 404 on load shows "Este post não está mais disponível."', async () => {
    session(null);
    mockedGetPost.mockRejectedValue(httpError(404));
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    expect(await screen.findByText('Este post não está mais disponível.')).toBeOnTheScreen();
    expect(screen.queryByText('Entre para comentar.')).not.toBeOnTheScreen();
  });

  it('another error on load shows the message with retry', async () => {
    session(null);
    mockedGetPost.mockRejectedValueOnce(networkError);
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    expect(await screen.findByText('Não foi possível conectar à API.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      await screen.findByRole('header', { name: 'Guia da feira de ciências' }),
    ).toBeOnTheScreen();
  });

  it('a 404 while commenting shows the same message and keeps the typed text', async () => {
    session(beatriz);
    mockedCreateComment.mockRejectedValue(httpError(404));
    await renderScreen(PostReadScreen, { params: { id: 'p1' } });
    const field = await screen.findByLabelText('Comentário');
    await fireEvent.changeText(field, 'Meu comentário');
    await fireEvent.press(screen.getByRole('button', { name: 'Comentar' }));
    expect(await screen.findByText('Este post não está mais disponível.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comentário')).toHaveDisplayValue('Meu comentário');
  });
});
