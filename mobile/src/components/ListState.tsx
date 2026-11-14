import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  status: 'loading' | 'empty' | 'error';
  // Mensagem do erro, vinda de getErrorMessage.
  message?: string;
  emptyMessage?: string;
  onRetry?: () => void;
}

// Toda lista distingue tres situacoes: carregando, vazia e com erro.
// Uma falha da API nunca aparece como lista vazia.
export function ListState({ status, message, emptyMessage, onRetry }: Props) {
  if (status === 'loading') {
    return (
      <View style={styles.box}>
        <ActivityIndicator accessibilityLabel="Carregando" size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>{emptyMessage ?? 'Nada por aqui ainda.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text accessibilityRole="alert" style={styles.text}>
        {message ?? 'Ocorreu um erro. Tente novamente.'}
      </Text>
      {onRetry ? <Button title="Tentar de novo" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  text: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
