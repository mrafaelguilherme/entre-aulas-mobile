import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { getErrorMessage } from '../../api/client';
import { teachersApi } from '../../api/people';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { IconButton } from '../../components/IconButton';
import { ListState } from '../../components/ListState';
import { PersonRow } from '../../components/PersonRow';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingInvites } from '../../contexts/PendingInvitesContext';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { canDeleteTeacher, canManageTeacher } from '../../permissions';
import { colors, spacing } from '../../theme';
import { Person } from '../../types';

// A aba Professores: convites pendentes no topo (a API ja ordena assim),
// depois os professores e o master. Cada linha mostra so as acoes permitidas.
export function TeachersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { reload: reloadPending } = usePendingInvites();
  const { items, status, error, refreshing, hasMore, refresh, loadMore } = usePaginatedList<Person>(
    teachersApi.list,
  );
  // Id da pessoa cuja acao esta em andamento, para travar os botoes dela.
  const [busyId, setBusyId] = useState<string | null>(null);
  const isMaster = user?.role === 'master';

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Executa uma acao sobre uma pessoa e recarrega a lista e o numero da aba.
  async function run(id: string, action: () => Promise<unknown>, failureTitle: string) {
    setBusyId(id);
    try {
      await action();
      await refresh();
      await reloadPending();
    } catch (cause) {
      Alert.alert(failureTitle, getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  function confirm(title: string, message: string, label: string, onConfirm: () => void) {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: label, style: 'destructive', onPress: onConfirm },
    ]);
  }

  function renderPending(person: Person) {
    const busy = busyId === person.id;
    return (
      <PersonRow
        title={person.name}
        subtitle={person.email}
        highlighted
        note={isMaster ? 'Convite pendente.' : 'Convite pendente. Aguardando o aceite do master.'}
        actions={
          isMaster ? (
            <>
              <Button
                title="Aceitar"
                size="compact"
                accessibilityLabel={`Aceitar ${person.name}`}
                loading={busy}
                onPress={() =>
                  run(person.id, () => teachersApi.approve(person.id), 'Não foi possível aceitar')
                }
              />
              <Button
                title="Recusar"
                variant="danger"
                size="compact"
                accessibilityLabel={`Recusar ${person.name}`}
                accessibilityHint="Pede confirmação antes de recusar"
                disabled={busy}
                onPress={() =>
                  confirm(
                    'Recusar convite',
                    `Recusar o convite de ${person.name}? O cadastro é apagado.`,
                    'Recusar',
                    () =>
                      run(
                        person.id,
                        () => teachersApi.reject(person.id),
                        'Não foi possível recusar',
                      ),
                  )
                }
              />
            </>
          ) : undefined
        }
      />
    );
  }

  function renderActive(person: Person) {
    const editable = canManageTeacher(user, person.id);
    const deletable = canDeleteTeacher(user, person.id);
    let note: string | undefined;
    if (!editable) {
      note = 'Só o master pode alterar outro professor.';
    } else if (!deletable && !isMaster) {
      note = 'Só o master pode excluir um professor.';
    }
    return (
      <PersonRow
        title={person.role === 'master' ? `${person.name} (master)` : person.name}
        subtitle={person.email}
        note={note}
        titleActions={
          editable || deletable ? (
            <>
              {editable ? (
                <IconButton
                  icon="create-outline"
                  label={`Editar ${person.name}`}
                  onPress={() =>
                    navigation.navigate('PersonEditor', { role: 'teacher', id: person.id })
                  }
                />
              ) : null}
              {deletable ? (
                <IconButton
                  icon="trash-outline"
                  color={colors.danger}
                  label={`Excluir ${person.name}`}
                  accessibilityHint="Pede confirmação antes de excluir"
                  loading={busyId === person.id}
                  onPress={() =>
                    confirm(
                      'Excluir professor',
                      `Excluir ${person.name}? Os posts continuam publicados, e o master pode restaurar a conta.`,
                      'Excluir',
                      () =>
                        run(
                          person.id,
                          () => teachersApi.remove(person.id),
                          'Não foi possível excluir',
                        ),
                    )
                  }
                />
              ) : null}
            </>
          ) : undefined
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader
        title="Professores"
        right={
          <Button
            title="Cadastrar professor"
            variant="board"
            onPress={() => navigation.navigate('PersonEditor', { role: 'teacher' })}
          />
        }
      />
      <FlatList
        data={items}
        keyExtractor={(person) => person.id}
        renderItem={({ item }) =>
          item.status === 'pending' ? renderPending(item) : renderActive(item)
        }
        ListEmptyComponent={
          status === 'ready' ? undefined : (
            <ListState
              status={status}
              message={error ?? undefined}
              emptyMessage="Nenhum professor cadastrado."
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
