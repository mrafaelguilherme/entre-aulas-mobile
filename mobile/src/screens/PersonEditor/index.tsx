import { Formik } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Yup from 'yup';
import { getErrorMessage } from '../../api/client';
import { studentsApi, teachersApi, usersApi } from '../../api/people';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { ListState } from '../../components/ListState';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../contexts/AuthContext';
import { RootScreenProps } from '../../navigation/types';
import { canResetPassword } from '../../permissions';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { Person } from '../../types';

// Os mesmos limites da API: nome de 2 a 100, e-mail ate 254, senha de 15 a 128.
const nameSchema = Yup.string()
  .trim()
  .min(2, 'O nome precisa ter ao menos 2 caracteres.')
  .max(100, 'O nome pode ter até 100 caracteres.')
  .required('Informe o nome.');
const emailSchema = Yup.string()
  .trim()
  .lowercase()
  .max(254, 'O e-mail pode ter até 254 caracteres.')
  .email('Informe um e-mail válido.')
  .required('Informe o e-mail.');
const passwordRule = Yup.string()
  .min(15, 'A senha precisa ter ao menos 15 caracteres.')
  .max(128, 'A senha pode ter até 128 caracteres.');

const createSchema = Yup.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordRule.required('Informe a senha inicial.'),
});
const editSchema = Yup.object({ name: nameSchema, email: emailSchema });

type FormValues = { name: string; email: string; password: string };
type LoadStatus = 'loading' | 'ready' | 'error';

const LABELS = {
  teacher: { create: 'Cadastrar professor', edit: 'Editar professor' },
  student: { create: 'Cadastrar aluno', edit: 'Editar aluno' },
};

// O mesmo formulario para professor e aluno. Sem id, cadastra (com senha inicial).
// Com id, edita nome e e-mail. O master tambem redefine a senha de outra pessoa.
export function PersonEditorScreen({ route, navigation }: RootScreenProps<'PersonEditor'>) {
  const { role, id } = route.params;
  const { user } = useAuth();
  const peopleApi = role === 'teacher' ? teachersApi : studentsApi;

  const [person, setPerson] = useState<Person | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(id ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    peopleApi
      .get(id)
      .then((loaded) => {
        if (active) {
          setPerson(loaded);
          setLoadStatus('ready');
        }
      })
      .catch((cause) => {
        if (active) {
          setLoadError(getErrorMessage(cause));
          setLoadStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [id, attempt, peopleApi]);

  const retry = useCallback(() => {
    setLoadStatus('loading');
    setAttempt((count) => count + 1);
  }, []);

  async function save(values: FormValues) {
    setError('');
    const profile = { name: values.name.trim(), email: values.email.trim().toLowerCase() };
    try {
      if (id) {
        await peopleApi.update(id, profile);
        navigation.goBack();
        return;
      }
      const created = await peopleApi.create({ ...profile, password: values.password });
      if (created.status === 'pending') {
        Alert.alert(
          'Convite enviado',
          'Aguarde o aceite do master. Depois, a pessoa entra com a senha inicial.',
        );
      } else {
        Alert.alert(
          'Conta criada',
          'A pessoa já pode entrar com a senha inicial e vai trocá-la no primeiro acesso.',
        );
      }
      navigation.goBack();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function resetPassword() {
    if (!id) {
      return;
    }
    setPasswordError('');
    try {
      passwordRule.required('Informe a nova senha provisória.').validateSync(newPassword);
    } catch (cause) {
      setPasswordError((cause as Yup.ValidationError).message);
      return;
    }
    setResetting(true);
    try {
      await usersApi.resetPassword(id, newPassword);
      setNewPassword('');
      Alert.alert(
        'Senha redefinida',
        'A pessoa entra com a senha provisória e troca no próximo acesso.',
      );
    } catch (cause) {
      setPasswordError(getErrorMessage(cause));
    } finally {
      setResetting(false);
    }
  }

  const title = id ? LABELS[role].edit : LABELS[role].create;
  const showReset = Boolean(id) && canResetPassword(user, id ?? '');

  if (loadStatus !== 'ready') {
    return (
      <View style={styles.screen}>
        <ChalkHeader title={title} />
        <ListState status={loadStatus} message={loadError} onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ChalkHeader title={title} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Formik<FormValues>
          initialValues={{ name: person?.name ?? '', email: person?.email ?? '', password: '' }}
          validationSchema={id ? editSchema : createSchema}
          onSubmit={save}
        >
          {({ values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit }) => (
            <>
              <TextField
                label="Nome"
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                error={touched.name ? errors.name : undefined}
                autoComplete="name"
                maxLength={100}
              />
              <TextField
                label="E-mail"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                error={touched.email ? errors.email : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                maxLength={254}
              />
              {id ? null : (
                <TextField
                  label="Senha inicial"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={touched.password ? errors.password : undefined}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
              )}
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button title="Salvar" onPress={handleSubmit} loading={isSubmitting} />
            </>
          )}
        </Formik>

        {showReset ? (
          <View style={styles.resetBox}>
            <Text accessibilityRole="header" style={styles.resetTitle}>
              Redefinir senha
            </Text>
            <Text style={styles.resetHint}>
              Define uma senha provisória. A pessoa troca no próximo acesso.
            </Text>
            <TextField
              label="Nova senha provisória"
              value={newPassword}
              onChangeText={setNewPassword}
              error={passwordError || undefined}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Button
              title="Redefinir senha"
              variant="outline"
              onPress={resetPassword}
              loading={resetting}
            />
          </View>
        ) : null}
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
  resetBox: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  resetTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg - 1,
  },
  resetHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm + 1,
  },
});
