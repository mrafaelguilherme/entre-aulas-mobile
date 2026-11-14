import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chalkTray, colors, fonts, fontSizes, spacing, touchTarget } from '../theme';

interface Props {
  // Sem titulo, a lousa mostra o nome do app.
  title?: string;
  // Um botao ou texto no canto direito, como "Novo post".
  right?: ReactNode;
}

// A faixa escura do topo, com a canaleta de giz logo abaixo.
// E o unico destaque visual do app; o resto da tela fica quieto.
export function ChalkHeader({ title, right, children }: PropsWithChildren<Props>) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // So existe "Voltar" quando ha uma tela anterior na pilha raiz. Dentro das abas,
  // quem responde e a pilha (o pai), e nao o navegador de abas, que tambem "volta"
  // entre abas e mostraria o botao na tela errada.
  const stack = navigation.getParent() ?? navigation;
  const canGoBack = stack.canGoBack();

  return (
    <View>
      <View style={[styles.board, { paddingTop: insets.top + spacing.md }]}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => stack.goBack()}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onDark} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        ) : null}
        <View style={styles.row}>
          <Text accessibilityRole="header" style={title ? styles.title : styles.logo}>
            {title ?? 'Entre Aulas'}
          </Text>
          {right ? <View>{right}</View> : null}
        </View>
        {children}
      </View>
      <View style={styles.tray} />
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    marginLeft: -spacing.sm,
    paddingRight: spacing.sm,
  },
  backText: {
    color: colors.onDark,
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  logo: {
    flex: 1,
    color: colors.onDark,
    fontFamily: fonts.bold,
    fontSize: fontSizes.logo,
  },
  title: {
    flex: 1,
    color: colors.onDark,
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
  },
  tray: {
    height: chalkTray,
    backgroundColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
  },
});
