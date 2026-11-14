import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '../theme';
import { ChalkHeader } from './ChalkHeader';

// Tela provisoria. Cada passo da Parte 3 troca uma delas pela tela real.
export function Placeholder({ title }: { title?: string }) {
  return (
    <View style={styles.screen}>
      <ChalkHeader title={title} />
      <Text style={styles.text}>Em construção: {title ?? 'Posts'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  text: {
    padding: spacing.lg,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
