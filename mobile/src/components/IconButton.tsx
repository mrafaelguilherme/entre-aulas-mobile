import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, touchTarget } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  // Nome do icone no Ionicons: "create-outline" (lapis), "trash-outline" (lixeira).
  icon: IconName;
  // O nome que o leitor de tela fala. Diga o alvo: "Editar Guia da feira".
  label: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

// Visual de 32, area de toque de 48: o hitSlop completa a diferenca.
const BOX = 32;
const SLOP = (touchTarget - BOX) / 2;

// A acao de uma linha de lista, discreta: so o icone. O rotulo fica para
// o leitor de tela, e a confirmacao (quando houver) fica com quem chama.
export function IconButton({
  icon,
  label,
  onPress,
  color = colors.primary,
  loading = false,
  disabled = false,
  accessibilityHint,
}: Props) {
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      hitSlop={{ top: SLOP, bottom: SLOP, left: SLOP, right: SLOP }}
      onPress={() => {
        onPress();
      }}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={22} color={disabled ? colors.textSecondary : color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.disabled },
});
