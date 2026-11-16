import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../../api/client';
import { deletePost, listPosts } from '../../api/posts';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { IconButton } from '../../components/IconButton';
import { ListState } from '../../components/ListState';
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { canDeletePost, canEditPost } from '../../permissions';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { Post } from '../../types';
import { formatShortDate } from '../../utils/dates';

// A aba Gerenciar: todos os posts. Cada linha mostra so as acoes que a pessoa
// pode usar, como icones; sem acao, uma frase explica. Quem garante a regra e a API.
export function ManagePostsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { items, status, error, refreshing, hasMore, refresh, loadMore } =
    usePaginatedList<Post>(listPosts);
  // Id do post sendo excluido, para travar o icone dele.
  const [deleting, setDeleting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function confirmDelete(post: Post) {
    Alert.alert('Excluir post', `Excluir "${post.title}"? Os comentários dele também somem.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove(post.id) },
    ]);
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await deletePost(id);
      await refresh();
    } catch (cause) {
      Alert.alert('Não foi possível excluir', getErrorMessage(cause));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader
        title="Gerenciar posts"
        right={
          <Button
            title="Novo post"
            variant="board"
            onPress={() => navigation.navigate('PostEditor')}
          />
        }
      />
      <FlatList
        data={items}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => {
          const editable = canEditPost(user, item);
          const deletable = canDeletePost(user, item);
          return (
            <View style={styles.row}>
              <View style={styles.titleLine}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{formatShortDate(item.createdAt)}</Text>
              </View>
              <View style={styles.authorLine}>
                <Text style={styles.author}>{item.author}</Text>
                {editable || deletable ? (
                  <View style={styles.icons}>
                    {editable ? (
                      <IconButton
                        icon="create-outline"
                        label={`Editar ${item.title}`}
                        onPress={() => navigation.navigate('PostEditor', { id: item.id })}
                      />
                    ) : null}
                    {deletable ? (
                      <IconButton
                        icon="trash-outline"
                        color={colors.danger}
                        label={`Excluir ${item.title}`}
                        accessibilityHint="Pede confirmação antes de excluir"
                        loading={deleting === item.id}
                        onPress={() => confirmDelete(item)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
              {editable ? null : <Text style={styles.note}>Só quem criou o post pode editar.</Text>}
            </View>
          );
        }}
        ListEmptyComponent={
          status === 'ready' ? undefined : (
            <ListState
              status={status}
              message={error ?? undefined}
              emptyMessage="Nenhum post publicado ainda."
              onRetry={refresh}
            />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <ListState
              status={error ? 'error' : 'loading'}
              message={error ?? undefined}
              onRetry={loadMore}
            />
          ) : undefined
        }
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  // Titulo a esquerda e data a direita, alinhada com a primeira linha do titulo.
  titleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.md + 1,
    lineHeight: 22,
  },
  date: {
    paddingTop: 3,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  authorLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  author: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  icons: { flexDirection: 'row', gap: spacing.xs },
  note: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
});
