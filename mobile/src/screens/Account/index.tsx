import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master',
  teacher: 'Professor(a)',
  student: 'Aluno(a)',
};

// A aba Conta: quem esta logado, trocar senha e sair.
export function AccountScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader title="Conta" />
      <View style={styles.body}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.detail}>{user.email}</Text>
        <Text style={styles.detail}>Perfil: {ROLE_LABELS[user.role]}</Text>
        <View style={styles.actions}>
          <Button
            title="Trocar senha"
            variant="outline"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          {user.role === 'master' ? (
            <Button
              title="Contas excluídas"
              variant="outline"
              onPress={() => navigation.navigate('DeletedAccounts')}
            />
          ) : null}
          <Button title="Sair" variant="danger" onPress={signOut} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.xs },
  name: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
  },
  detail: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
