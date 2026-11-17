import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import * as authApi from '../api/auth';
import { getStatus, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { SessionUser } from '../types';

// Chave do token no cofre do aparelho (SecureStore, cifrado pelo sistema).
const TOKEN_KEY = 'entre-aulas-token';

interface AuthValue {
  // true enquanto o app ainda nao sabe se ha alguem logado.
  loading: boolean;
  user: SessionUser | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  // Marca que a pessoa esta saindo por vontade propria, para nao avisar "sessao expirada".
  const leaving = useRef(false);
  // Marca que o aviso de sessao expirada ja apareceu. Varias requisicoes podem
  // receber 401 ao mesmo tempo (ex.: a lista e o numero de pendentes): um aviso so.
  const alerted = useRef(false);

  // Apaga o token do aparelho e da memoria, e esquece quem estava logado.
  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // Ao abrir o app: se ha token guardado, pergunta a API quem e a pessoa.
  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!saved) {
          return;
        }
        setAuthToken(saved);
        const me = await authApi.getMe();
        if (active) {
          setUser(me);
          alerted.current = false;
        }
      } catch (cause) {
        if (getStatus(cause) === 401) {
          // Token velho: apaga e comeca sem sessao.
          await clearSession();
        } else {
          // Sem rede ou API fora do ar: comeca como visitante, mas guarda o
          // token no cofre para tentar de novo na proxima abertura.
          setAuthToken(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, [clearSession]);

  // Um 401 em requisicao com token: a sessao acabou. Limpa e avisa uma vez.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const wasLeaving = leaving.current;
      clearSession();
      if (!wasLeaving && !alerted.current) {
        alerted.current = true;
        Alert.alert('Sessão expirada', 'Entre novamente para continuar.');
      }
    });
    return () => setUnauthorizedHandler(() => {});
  }, [clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Um login novo nunca leva o token antigo junto.
      setAuthToken(null);
      const token = await authApi.signIn(email, password);
      setAuthToken(token);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      try {
        const me = await authApi.getMe();
        setUser(me);
        alerted.current = false;
      } catch (error) {
        await clearSession();
        throw error;
      }
    },
    [clearSession],
  );

  const signOut = useCallback(async () => {
    leaving.current = true;
    try {
      // Avisa a API para todo token desta conta deixar de valer.
      await authApi.signOut();
    } catch {
      // Sem rede, a sessao local e apagada mesmo assim.
    } finally {
      await clearSession();
      leaving.current = false;
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ loading, user, signIn, signOut }),
    [loading, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
