import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { ListState } from '../components/ListState';
import { useAuth } from '../contexts/AuthContext';
import { usePendingInvites } from '../contexts/PendingInvitesContext';
import { isTeacher } from '../permissions';
import { AccountScreen } from '../screens/Account';
import { ChangePasswordScreen } from '../screens/ChangePassword';
import { DeletedAccountsScreen } from '../screens/DeletedAccounts';
import { LoginScreen } from '../screens/Login';
import { ManagePostsScreen } from '../screens/ManagePosts';
import { PersonEditorScreen } from '../screens/PersonEditor';
import { PostEditorScreen } from '../screens/PostEditor';
import { PostReadScreen } from '../screens/PostRead';
import { PostsListScreen } from '../screens/PostsList';
import { StudentsScreen } from '../screens/Students';
import { TeachersScreen } from '../screens/Teachers';
import { colors, fonts, fontSizes, spacing } from '../theme';
import { tabsForRole } from './tabsForRole';
import { RootStackParamList, TabName, TabParamList } from './types';

// Referencia ao container: os testes leem as rotas registradas por aqui.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

// Cada aba: a tela que abre e o icone.
const TABS: Record<TabName, { screen: ComponentType; icon: IconName }> = {
  Posts: { screen: PostsListScreen, icon: 'document-text-outline' },
  Entrar: { screen: LoginScreen, icon: 'log-in-outline' },
  Gerenciar: { screen: ManagePostsScreen, icon: 'create-outline' },
  Professores: { screen: TeachersScreen, icon: 'school-outline' },
  Alunos: { screen: StudentsScreen, icon: 'people-outline' },
  Conta: { screen: AccountScreen, icon: 'person-circle-outline' },
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

// A aba ativa ganha uma pilula escura em volta do icone.
function TabIcon({ icon, focused, color }: { icon: IconName; focused: boolean; color: string }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons name={icon} size={20} color={focused ? colors.onDark : color} />
    </View>
  );
}

// A barra inferior. As abas mudam com o perfil; uma aba proibida nem e registrada.
function Tabs() {
  const { user } = useAuth();
  const { count } = usePendingInvites();
  const tabs = tabsForRole(user?.role ?? null);
  const showBadge = user?.role === 'master' && count > 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.dark,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarLabelStyle: styles.label,
      }}
    >
      {tabs.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={TABS[name].screen}
          options={{
            tabBarAccessibilityLabel: name,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon={TABS[name].icon} focused={focused} color={color} />
            ),
            tabBarBadge: name === 'Professores' && showBadge ? count : undefined,
            tabBarBadgeStyle: styles.badge,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

// A pilha raiz. As abas sao a primeira tela; leitura e formularios abrem por cima, sem barra.
export function RootNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ListState status="loading" />
      </View>
    );
  }

  return (
    // A key troca quando o primeiro acesso termina: a navegacao inteira recomeca
    // do zero, nas abas, em vez de continuar parada na tela de troca de senha.
    <NavigationContainer
      key={user?.mustChangePassword ? 'first-access' : 'main'}
      ref={navigationRef}
      theme={theme}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user?.mustChangePassword ? (
          // Primeiro acesso: so existe a troca de senha. Nao ha para onde voltar.
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="PostRead" component={PostReadScreen} />
            {user ? <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} /> : null}
            {isTeacher(user) ? (
              <>
                <Stack.Screen name="PostEditor" component={PostEditorScreen} />
                <Stack.Screen name="PersonEditor" component={PersonEditorScreen} />
              </>
            ) : null}
            {user?.role === 'master' ? (
              <Stack.Screen name="DeletedAccounts" component={DeletedAccountsScreen} />
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 70,
    paddingTop: spacing.xs,
  },
  item: { paddingVertical: spacing.xs },
  label: { fontFamily: fonts.bold, fontSize: fontSizes.sm - 1 },
  pill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.dark },
  badge: {
    backgroundColor: colors.danger,
    color: colors.onDark,
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm - 2,
  },
});
