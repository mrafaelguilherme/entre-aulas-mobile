import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing, touchTarget } from '../theme';

// primary: acao principal. outline: acao comum. danger: excluir, recusar.
// board: botao branco que fica em cima da lousa.
type Variant = 'primary' | 'outline' | 'danger' | 'board';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  // Enquanto envia: mostra o giro e ignora toques. Evita o toque duplo.
  loading?: boolean;
  // Nome lido pelo leitor de tela. Util quando varios botoes tem o mesmo titulo,
  // como "Editar" em cada linha de uma lista: "Editar Guia da feira".
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const TEXT_COLORS: Record<Variant, string> = {
  primary: colors.onDark,
  outline: colors.primary,
  danger: colors.danger,
  board: colors.dark,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const blocked = disabled || loading;
  const textColor = disabled ? colors.textSecondary : TEXT_COLORS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      // Chama a acao sem devolver nada: uma acao assincrona nao prende o toque.
      onPress={() => {
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderColor: colors.primary },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  board: { backgroundColor: colors.onDark, borderColor: colors.onDark },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.border },
  pressed: { opacity: 0.8 },
  text: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
  },
});
