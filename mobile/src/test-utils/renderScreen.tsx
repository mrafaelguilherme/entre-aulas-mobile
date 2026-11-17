import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render } from '@testing-library/react-native';
import { ComponentType } from 'react';

type Params = Record<string, object | undefined>;
// Qualquer tela serve aqui: as props vem da propria pilha.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyScreen = ComponentType<any>;

interface Options {
  // Parametros da rota, como { id: 'p1' }.
  params?: object;
  // Telas de apoio, para conferir uma navegacao. Ex.: { PostRead: StubScreen }.
  routes?: Record<string, AnyScreen>;
}

// Renderiza uma tela dentro de uma pilha de verdade, para useNavigation,
// useRoute e useFocusEffect funcionarem como no app.
export function renderScreen(Screen: AnyScreen, { params, routes = {} }: Options = {}) {
  const Stack = createNativeStackNavigator<Params>();
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Screen" component={Screen} initialParams={params} />
        {Object.entries(routes).map(([name, component]) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>,
  );
}
