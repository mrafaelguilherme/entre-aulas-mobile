import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage, getStatus } from '../../api/client';
import { createComment, deleteComment, listComments } from '../../api/comments';
import { getPost } from '../../api/posts';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { IconButton } from '../../components/IconButton';
import { ListState } from '../../components/ListState';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { RootScreenProps } from '../../navigation/types';
import { canDeleteComment } from '../../permissions';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { Comment, Post } from '../../types';
import { formatDate, formatDateTime } from '../../utils/dates';

const POST_GONE = 'Este post não está mais disponível.';

type PostStatus = 'loading' | 'ready' | 'error' | 'gone';

// Leitura de um post, com os comentarios e o campo para comentar.
export function PostReadScreen({ route, navigation }: RootScreenProps<'PostRead'>) {
  const { id } = route.params;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [postStatus, setPostStatus] = useState<PostStatus>('loading');
  const [postError, setPostError] = useState('');

  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const [sending, setSending] = useState(false);
  // Id do comentario sendo apagado, para travar o icone dele.
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchComments = useCallback((page: number) => listComments(id, page), [id]);
  const comments = usePaginatedList<Comment>(fetchComments);
  const refreshComments = comments.refresh;

  const loadPost = useCallback(async () => {
    setPostStatus('loading');
    try {
      setPost(await getPost(id));
      setPostStatus('ready');
    } catch (cause) {
      // 404: o post foi excluido enquanto esta pessoa chegava ate aqui.
      if (getStatus(cause) === 404) {
        setPostStatus('gone');
      } else {
        setPostError(getErrorMessage(cause));
        setPostStatus('error');
      }
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPost();
      refreshComments();
    }, [loadPost, refreshComments]),
  );

  async function sendComment() {
    const content = draft.trim();
    if (!content) {
      setDraftError('Escreva algo antes de comentar.');
      return;
    }
    setSending(true);
    setDraftError('');
    try {
      await createComment(id, content);
      setDraft('');
      await refreshComments();
    } catch (cause) {
      // O texto digitado fica no campo, para a pessoa nao perder o que escreveu.
      setDraftError(getStatus(cause) === 404 ? POST_GONE : getErrorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  function confirmDelete(comment: Comment) {
    Alert.alert('Apagar comentário', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => removeComment(comment.id) },
    ]);
  }

  async function removeComment(commentId: string) {
    setDeleting(commentId);
    try {
      await deleteComment(commentId);
      await refreshComments();
    } catch (cause) {
      Alert.alert('Não foi possível apagar', getErrorMessage(cause));
    } finally {
      setDeleting(null);
    }
  }

  if (postStatus !== 'ready' || !post) {
    return (
      <View style={styles.screen}>
        <ChalkHeader title={postStatus === 'gone' ? 'Post indisponível' : 'Leitura'} />
        {postStatus === 'gone' ? (
          <View style={styles.gone}>
            <Text style={styles.goneText}>{POST_GONE}</Text>
            <Button
              title="Voltar para a lista"
              variant="outline"
              onPress={() => navigation.goBack()}
            />
          </View>
        ) : (
          <ListState
            status={postStatus === 'error' ? 'error' : 'loading'}
            message={postError}
            onRetry={loadPost}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader title={post.title}>
        <Text style={styles.byline}>
          {post.author}
          {'\n'}
          {formatDate(post.createdAt)}
        </Text>
      </ChalkHeader>
      <FlatList
        data={comments.items}
        keyExtractor={(comment) => comment.id}
        ListHeaderComponent={
          <View style={styles.body}>
            <Text style={styles.content}>{post.content}</Text>
            <Text accessibilityRole="header" style={styles.heading}>
              Comentários
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentMeta}>
              <Text style={styles.commentAuthor}>{item.author}</Text>
              <Text style={styles.commentDate}>{formatDateTime(item.createdAt)}</Text>
              {canDeleteComment(user, item) ? (
                <IconButton
                  icon="trash-outline"
                  color={colors.danger}
                  label={`Apagar comentário de ${item.author}`}
                  accessibilityHint="Pede confirmação antes de apagar"
                  loading={deleting === item.id}
                  onPress={() => confirmDelete(item)}
                />
              ) : null}
            </View>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          comments.status === 'ready' ? undefined : (
            <ListState
              status={comments.status}
              message={comments.error ?? undefined}
              emptyMessage="Nenhum comentário ainda."
              onRetry={refreshComments}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {comments.hasMore ? (
              <Button title="Carregar mais" variant="outline" onPress={comments.loadMore} />
            ) : null}
            {user ? (
              <>
                <TextField
                  label="Comentário"
                  placeholder="Escreva um comentário"
                  value={draft}
                  onChangeText={setDraft}
                  error={draftError || undefined}
                  multiline
                  maxLength={1000}
                />
                <Button title="Comentar" onPress={sendComment} loading={sending} />
              </>
            ) : (
              <>
                <Text style={styles.signInHint}>Entre para comentar.</Text>
                <Button
                  title="Entrar"
                  variant="outline"
                  onPress={() => navigation.navigate('Tabs', { screen: 'Entrar' })}
                />
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  byline: {
    color: colors.onDark,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm + 1,
    lineHeight: 20,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  body: { paddingTop: spacing.lg, gap: spacing.lg },
  content: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md + 1,
    lineHeight: 25,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg - 1,
  },
  comment: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  // Autor a esquerda; data, hora e o icone de apagar a direita.
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthor: {
    flex: 1,
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm + 1,
  },
  commentDate: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm - 1,
  },
  commentText: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm + 1,
    lineHeight: 20,
  },
  footer: { paddingTop: spacing.lg, gap: spacing.md },
  signInHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
  gone: { padding: spacing.xl, gap: spacing.lg, alignItems: 'center' },
  goneText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
