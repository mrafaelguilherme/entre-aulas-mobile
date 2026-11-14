import { useId } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing, touchTarget } from '../theme';

interface Props extends Omit<
  TextInputProps,
  'style' | 'accessibilityLabel' | 'accessibilityLabelledBy'
> {
  label: string;
  // O erro aparece em texto, ligado ao campo. Nunca so pela cor.
  error?: string;
}

export function TextField({ label, error, editable = true, multiline = false, ...input }: Props) {
  // Um id unico liga o rotulo ao campo para o leitor de tela.
  const labelId = useId();

  return (
    <View style={styles.wrapper}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        accessibilityHint={error}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          multiline && styles.multiline,
          !editable && styles.readOnly,
          Boolean(error) && styles.inputError,
        ]}
        {...input}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  input: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  readOnly: { backgroundColor: colors.disabled, color: colors.textSecondary },
  inputError: { borderColor: colors.danger },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
});
