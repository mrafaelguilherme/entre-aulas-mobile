import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  // Explica, em texto, uma situacao ou por que nao ha acao.
  note?: string;
  // Icones discretos na linha do nome: editar, excluir.
  titleActions?: ReactNode;
  // Botoes com texto, abaixo: aceitar, recusar, restaurar.
  actions?: ReactNode;
  // Linha em destaque, como um convite pendente.
  highlighted?: boolean;
}

// Uma linha das listas de pessoas: nome e icones, e-mail, nota e botoes.
export function PersonRow({
  title,
  subtitle,
  note,
  titleActions,
  actions,
  highlighted = false,
}: Props) {
  return (
    <View style={[styles.row, highlighted && styles.highlighted]}>
      <View style={styles.titleLine}>
        <Text style={styles.title}>{title}</Text>
        {titleActions ? <View style={styles.titleActions}>{titleActions}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  highlighted: {
    backgroundColor: colors.surface,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  titleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.md + 1,
  },
  titleActions: { flexDirection: 'row', gap: spacing.xs },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  note: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
