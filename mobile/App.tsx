import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { PendingInvitesProvider } from './src/contexts/PendingInvitesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// A raiz do app: fonte, margens seguras, sessao, convites pendentes e navegacao.
export default function App() {
  const [fontsLoaded] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PendingInvitesProvider>
          <RootNavigator />
        </PendingInvitesProvider>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
