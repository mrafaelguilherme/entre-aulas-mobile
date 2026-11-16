import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { getErrorMessage } from '../../api/client';
import { usersApi } from '../../api/people';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { ListState } from '../../components/ListState';
import { PersonRow } from '../../components/PersonRow';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { colors, spacing } from '../../theme';
import { Person, UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master',
  teacher: 'Professor(a)',
  student: 'Aluno(a)',
};

// So o master chega aqui. Restaurar devolve o acesso e o controle dos posts,
// porque o id da conta continua o mesmo.
export function DeletedAccountsScreen() {
  const { items, status, error, refreshing, hasMore, refresh, loadMore } = usePaginatedList<Person>(
    usersApi.listDeleted,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function restore(id: string) {
    setBusyId(id);
    try {
      await usersApi.restore(id);
      await refresh();
    } catch (cause) {
      Alert.alert('Não foi possível restaurar', getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader title="Contas excluídas" />
      <FlatList
        data={items}
        keyExtractor={(person) => person.id}
        renderItem={({ item }) => (
          <PersonRow
            title={item.name}
            subtitle={item.email}
            note={ROLE_LABELS[item.role]}
            actions={
              <Button
                title="Restaurar"
                size="compact"
                accessibilityLabel={`Restaurar ${item.name}`}
                loading={busyId === item.id}
                onPress={() => restore(item.id)}
              />
            }
          />
        )}
        ListEmptyComponent={
          status === 'ready' ? undefined : (
            <ListState
              status={status}
              message={error ?? undefined}
              emptyMessage="Nenhuma conta excluída."
              onRetry={refresh}
            />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <Button title="Carregar mais" variant="outline" onPress={loadMore} />
            </View>
          ) : undefined
        }
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  footer: { paddingVertical: spacing.lg },
});
