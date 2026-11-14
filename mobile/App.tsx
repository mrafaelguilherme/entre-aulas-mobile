import {
  AtkinsonHyperlegibleNext_400Regular,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// O comando "adb reverse" liga o localhost do emulador ao seu computador.
const API_URL = 'http://localhost:3000';

type Result = 'testando...' | 'OK' | 'FALHOU';

export default function App() {
  const [fontLoaded] = useFonts({ AtkinsonHyperlegibleNext_400Regular });
  const [api, setApi] = useState<Result>('testando...');
  const [storage, setStorage] = useState<Result>('testando...');

  useEffect(() => {
    fetch(`${API_URL}/posts`)
      .then((response) => setApi(response.ok ? 'OK' : 'FALHOU'))
      .catch(() => setApi('FALHOU'));

    async function checkStorage() {
      try {
        await SecureStore.setItemAsync('validacao', 'entre-aulas');
        const saved = await SecureStore.getItemAsync('validacao');
        await SecureStore.deleteItemAsync('validacao');
        setStorage(saved === 'entre-aulas' ? 'OK' : 'FALHOU');
      } catch {
        setStorage('FALHOU');
      }
    }

    checkStorage();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entre Aulas</Text>
      <Text style={styles.line}>API: {api}</Text>
      <Text style={styles.line}>Armazenamento seguro: {storage}</Text>
      <Text style={styles.line}>Fonte: {fontLoaded ? 'OK' : 'carregando...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0d4055',
  },
  title: {
    marginBottom: 24,
    color: '#ffffff',
    fontSize: 32,
    fontFamily: 'AtkinsonHyperlegibleNext_400Regular',
  },
  line: {
    marginBottom: 12,
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'AtkinsonHyperlegibleNext_400Regular',
  },
});
