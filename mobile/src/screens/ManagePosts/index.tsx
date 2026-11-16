import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { getErrorMessage } from '../../api/client';
import { deletePost, listPosts } from '../../api/posts';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { ListState } from '../../components/ListState';
import { useAuth } from '../../contexts/AuthContext';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { canDeletePost, canEditPost } from '../../permissions';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { Post } from '../../types';

// A aba Gerenciar: todos os posts, com Editar e Excluir conforme a posse.
// A tela so reflete a regra; quem garante e a API.
export function ManagePostsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { items, status, error, refreshing, hasMore, refresh, loadMore } =
    usePaginatedList<Post>(listPosts);
  // Id do post sendo excluido, para travar o botao dele.
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
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.author}>{item.author}</Text>
              <View style={styles.actions}>
                <Button
                  title="Editar"
                  variant="outline"
                  accessibilityLabel={`Editar ${item.title}`}
                  disabled={!editable}
                  onPress={() => navigation.navigate('PostEditor', { id: item.id })}
                />
                <Button
                  title="Excluir"
                  variant="danger"
                  accessibilityLabel={`Excluir ${item.title}`}
                  accessibilityHint="Pede confirmação antes de excluir"
                  disabled={!deletable}
                  loading={deleting === item.id}
                  onPress={() => confirmDelete(item)}
                />
              </View>
              {editable ? null : (
                <Text style={styles.note}>Só quem criou o post pode alterar.</Text>
              )}
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
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.md + 1,
  },
  author: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  note: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
});
