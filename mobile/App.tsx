import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './src/components/Button';
import { ListState } from './src/components/ListState';
import { TextField } from './src/components/TextField';
import { colors, fonts, fontSizes, spacing } from './src/theme';

// Tela provisoria: uma vitrine dos componentes. O Passo 3.3 troca por navegacao.
export default function App() {
  const [fontsLoaded] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
  });
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);

  if (!fontsLoaded) {
    return null;
  }

  function sendForTwoSeconds() {
    setSending(true);
    setTimeout(() => setSending(false), 2000);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Componentes do Entre Aulas</Text>
          <TextField
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Digite uma letra para ver o erro"
            error={name.length === 1 ? 'Digite ao menos 2 caracteres.' : undefined}
          />
          <Button title="Primário" onPress={() => {}} />
          <Button title="Contorno" variant="outline" onPress={() => {}} />
          <Button title="Perigo" variant="danger" onPress={() => {}} />
          <Button title="Desativado" disabled onPress={() => {}} />
          <Button title="Enviar por 2 segundos" loading={sending} onPress={sendForTwoSeconds} />
          <ListState status="error" message="Não foi possível conectar à API." onRetry={() => {}} />
        </ScrollView>
      </SafeAreaView>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
