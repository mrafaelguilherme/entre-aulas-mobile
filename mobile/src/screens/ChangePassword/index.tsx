import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Yup from 'yup';
import { changePassword } from '../../api/auth';
import { getErrorMessage, getStatus } from '../../api/client';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, fontSizes, spacing } from '../../theme';

// Os mesmos limites da API: de 15 a 128 caracteres.
const schema = Yup.object({
  currentPassword: Yup.string().required('Informe a senha atual.'),
  newPassword: Yup.string()
    .min(15, 'A nova senha precisa ter ao menos 15 caracteres.')
    .max(128, 'A nova senha pode ter até 128 caracteres.')
    .required('Informe a nova senha.'),
  confirmation: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'A confirmação precisa ser igual à nova senha.')
    .required('Confirme a nova senha.'),
});

// Troca de senha. No primeiro acesso ela e obrigatoria: a pilha so tem esta tela.
export function ChangePasswordScreen() {
  const { user, signIn, signOut } = useAuth();
  const navigation = useNavigation();
  const [error, setError] = useState('');
  const forced = user?.mustChangePassword ?? false;

  if (!user) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader title="Trocar senha" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {forced ? <Text style={styles.hint}>Troque a senha provisória para continuar.</Text> : null}
        <Formik
          initialValues={{ currentPassword: '', newPassword: '', confirmation: '' }}
          validationSchema={schema}
          onSubmit={async (values) => {
            setError('');
            try {
              await changePassword(values.currentPassword, values.newPassword);
              // A troca invalida o token antigo. Entra de novo com a senha nova.
              await signIn(user.email, values.newPassword);
              Alert.alert('Senha alterada', 'Sua nova senha já vale.');
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            } catch (cause) {
              setError(
                getStatus(cause) === 400 ? 'A senha atual não confere.' : getErrorMessage(cause),
              );
            }
          }}
        >
          {({ values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit }) => (
            <>
              <TextField
                label="Senha atual"
                value={values.currentPassword}
                onChangeText={handleChange('currentPassword')}
                onBlur={handleBlur('currentPassword')}
                error={touched.currentPassword ? errors.currentPassword : undefined}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
              />
              <TextField
                label="Nova senha"
                value={values.newPassword}
                onChangeText={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
                error={touched.newPassword ? errors.newPassword : undefined}
                secureTextEntry
                autoComplete="new-password"
              />
              <TextField
                label="Confirmar nova senha"
                value={values.confirmation}
                onChangeText={handleChange('confirmation')}
                onBlur={handleBlur('confirmation')}
                error={touched.confirmation ? errors.confirmation : undefined}
                secureTextEntry
                autoComplete="new-password"
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button title="Salvar" onPress={handleSubmit} loading={isSubmitting} />
            </>
          )}
        </Formik>
        {forced ? <Button title="Sair" variant="outline" onPress={signOut} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg },
  hint: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
