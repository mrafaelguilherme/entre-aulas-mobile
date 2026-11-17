import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { getErrorMessage } from '../../api/client';
import { studentsApi } from '../../api/people';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { IconButton } from '../../components/IconButton';
import { ListState } from '../../components/ListState';
import { PersonRow } from '../../components/PersonRow';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { colors, spacing } from '../../theme';
import { Person } from '../../types';

// A aba Alunos: professor e master editam e excluem qualquer aluno.
// A exclusao e logica; so o master restaura, em "Contas excluídas".
export function StudentsScreen() {
  const navigation = useNavigation();
  const { items, status, error, refreshing, hasMore, refresh, loadMore } = usePaginatedList<Person>(
    studentsApi.list,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function confirmDelete(person: Person) {
    Alert.alert(
      'Excluir aluno',
      `Excluir ${person.name}? O master pode restaurar a conta depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => remove(person.id) },
      ],
    );
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await studentsApi.remove(id);
      await refresh();
    } catch (cause) {
      Alert.alert('Não foi possível excluir', getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader
        title="Alunos"
        right={
          <Button
            title="Cadastrar aluno"
            variant="board"
            onPress={() => navigation.navigate('PersonEditor', { role: 'student' })}
          />
        }
      />
      <FlatList
        data={items}
        keyExtractor={(person) => person.id}
        renderItem={({ item }) => (
          <PersonRow
            title={item.name}
            subtitle={item.email}
            titleActions={
              <>
                <IconButton
                  icon="create-outline"
                  label={`Editar ${item.name}`}
                  onPress={() =>
                    navigation.navigate('PersonEditor', { role: 'student', id: item.id })
                  }
                />
                <IconButton
                  icon="trash-outline"
                  color={colors.danger}
                  label={`Excluir ${item.name}`}
                  accessibilityHint="Pede confirmação antes de excluir"
                  loading={busyId === item.id}
                  onPress={() => confirmDelete(item)}
                />
              </>
            }
          />
        )}
        ListEmptyComponent={
          status === 'ready' ? undefined : (
            <ListState
              status={status}
              message={error ?? undefined}
              emptyMessage="Nenhum aluno cadastrado."
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
