import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { listPosts, searchPosts } from '../../api/posts';
import { ChalkHeader } from '../../components/ChalkHeader';
import { ListState } from '../../components/ListState';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { colors, fonts, fontSizes, radius, spacing, touchTarget } from '../../theme';
import { Post } from '../../types';

// A tela inicial: lousa com busca e a lista de posts, do mais novo ao mais antigo.
export function PostsListScreen() {
  const navigation = useNavigation();
  // O que esta digitado no campo.
  const [query, setQuery] = useState('');
  // O termo que vale na busca. So muda quando a pessoa confirma no teclado.
  // A ref e lida pela funcao de busca; o estado e lido pela tela.
  const termRef = useRef('');
  const [activeTerm, setActiveTerm] = useState('');

  const fetchPage = useCallback((page: number) => {
    const term = termRef.current;
    return term ? searchPosts(term, page) : listPosts(page);
  }, []);
  const { items, status, error, refreshing, hasMore, refresh, loadMore } =
    usePaginatedList<Post>(fetchPage);

  // Recarrega sempre que a aba ganha foco: um post novo aparece ao voltar.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function submitSearch() {
    const term = query.trim();
    termRef.current = term;
    setActiveTerm(term);
    refresh();
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader>
        <TextInput
          accessibilityLabel="Buscar por palavra-chave"
          placeholder="Buscar por palavra-chave"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
      </ChalkHeader>
      <FlatList
        data={items}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <PostRow post={item} onPress={() => navigation.navigate('PostRead', { id: item.id })} />
        )}
        ListEmptyComponent={
          status === 'ready' ? undefined : (
            <ListState
              status={status}
              message={error ?? undefined}
              emptyMessage={activeTerm ? 'Nenhum post encontrado.' : 'Nenhum post publicado ainda.'}
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
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

function PostRow({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir o post ${post.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.author}>{post.author}</Text>
      <Text style={styles.excerpt} numberOfLines={3}>
        {post.content}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  search: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  row: { paddingVertical: spacing.md, gap: spacing.xs },
  pressed: { opacity: 0.7 },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
  },
  author: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm + 1,
  },
  excerpt: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm + 1,
    lineHeight: 20,
  },
});
