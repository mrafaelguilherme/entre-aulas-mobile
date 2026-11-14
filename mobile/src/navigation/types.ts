import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// As abas da barra inferior. Quais aparecem depende do perfil (tabsForRole).
export type TabName = 'Posts' | 'Entrar' | 'Gerenciar' | 'Professores' | 'Alunos' | 'Conta';
export type TabParamList = Record<TabName, undefined>;

// As telas da pilha raiz e o que cada uma recebe.
// Sem id, PostEditor e PersonEditor criam; com id, editam.
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  PostRead: { id: string };
  PostEditor: { id?: string } | undefined;
  PersonEditor: { role: 'teacher' | 'student'; id?: string };
  ChangePassword: undefined;
  DeletedAccounts: undefined;
};

// Tipo das props que cada tela da pilha recebe (navigation e route).
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// Faz useNavigation() conhecer as rotas em qualquer tela, sem repetir o tipo.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
