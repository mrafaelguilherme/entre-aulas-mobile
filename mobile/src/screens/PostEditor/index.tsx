import { Formik } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Yup from 'yup';
import { getErrorMessage } from '../../api/client';
import { createPost, getPost, updatePost } from '../../api/posts';
import { Button } from '../../components/Button';
import { ChalkHeader } from '../../components/ChalkHeader';
import { ListState } from '../../components/ListState';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../contexts/AuthContext';
import { RootScreenProps } from '../../navigation/types';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { Post, PostInput } from '../../types';

// Os mesmos limites da API. O servidor confere de novo.
const schema = Yup.object({
  title: Yup.string()
    .trim()
    .max(200, 'O título pode ter até 200 caracteres.')
    .required('Informe o título.'),
  content: Yup.string()
    .trim()
    .max(20000, 'O conteúdo pode ter até 20000 caracteres.')
    .required('Informe o conteúdo.'),
});

type LoadStatus = 'loading' | 'ready' | 'error';

// Sem id, cria um post. Com id, edita. A mesma tela, com titulo e dados proprios.
// O autor aparece na lousa, como na leitura: ele vem do servidor, e nao do formulario.
export function PostEditorScreen({ route, navigation }: RootScreenProps<'PostEditor'>) {
  const id = route.params?.id;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(id ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  // Carrega o post atual quando esta editando. "active" ignora a resposta se a tela fechar.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    getPost(id)
      .then((loaded) => {
        if (active) {
          setPost(loaded);
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
  }, [id, attempt]);

  const retry = useCallback(() => {
    setLoadStatus('loading');
    setAttempt((count) => count + 1);
  }, []);

  async function save(values: PostInput) {
    setError('');
    const input = { title: values.title.trim(), content: values.content.trim() };
    try {
      if (id) {
        await updatePost(id, input);
      } else {
        await createPost(input);
      }
      navigation.goBack();
    } catch (cause) {
      // O texto digitado continua no formulario.
      setError(getErrorMessage(cause));
    }
  }

  const title = id ? 'Editar post' : 'Novo post';
  const authorName = post?.author ?? user?.name ?? '';

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
      <ChalkHeader title={title}>
        <Text style={styles.byline}>Autor: {authorName}</Text>
      </ChalkHeader>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Formik
          initialValues={{ title: post?.title ?? '', content: post?.content ?? '' }}
          validationSchema={schema}
          onSubmit={save}
        >
          {({ values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit }) => (
            <>
              <TextField
                label="Título"
                value={values.title}
                onChangeText={handleChange('title')}
                onBlur={handleBlur('title')}
                error={touched.title ? errors.title : undefined}
                maxLength={200}
              />
              <TextField
                label="Conteúdo"
                value={values.content}
                onChangeText={handleChange('content')}
                onBlur={handleBlur('content')}
                error={touched.content ? errors.content : undefined}
                multiline
                maxLength={20000}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  byline: {
    color: colors.onDark,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm + 1,
  },
  form: { padding: spacing.lg, gap: spacing.lg },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
  },
});
