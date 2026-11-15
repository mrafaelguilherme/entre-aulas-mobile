import { Formik } from 'formik';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Yup from 'yup';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, fontSizes, spacing } from '../../theme';

// As regras do formulario. O Yup confere antes de chamar a API.
const schema = Yup.object({
  email: Yup.string().trim().email('Informe um e-mail válido.').required('Informe o e-mail.'),
  password: Yup.string().required('Informe a senha.'),
});

// A aba Entrar, que so existe para quem nao esta logado.
// Depois do login, as abas mudam sozinhas e esta tela desaparece.
export function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState('');

  return (
    <View style={styles.screen}>
      <ChalkHeader title="Entrar" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={schema}
          onSubmit={async (values) => {
            setError('');
            try {
              await signIn(values.email.trim(), values.password);
            } catch (cause) {
              setError(getErrorMessage(cause));
            }
          }}
        >
          {({ values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit }) => (
            <>
              <TextField
                label="E-mail"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={touched.email ? errors.email : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <TextField
                label="Senha"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                error={touched.password ? errors.password : undefined}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button title="Entrar" onPress={handleSubmit} loading={isSubmitting} />
            </>
          )}
        </Formik>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
