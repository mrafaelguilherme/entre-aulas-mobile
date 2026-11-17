import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import { Paginated, Person } from '../types';
import { useAuth } from './AuthContext';

interface PendingInvitesValue {
  // Quantos convites de professor aguardam o aceite do master.
  count: number;
  reload(): Promise<void>;
}

const PendingInvitesContext = createContext<PendingInvitesValue>({
  count: 0,
  reload: async () => {},
});

// Pede so 1 item: o que interessa e o total.
async function fetchPendingTotal(): Promise<number> {
  const { data } = await api.get<Paginated<Person>>('/teachers', {
    params: { status: 'pending', limit: 1 },
  });
  return data.total;
}

// O numero aparece na aba Professores. So o master consulta a API;
// para os demais o numero e sempre zero.
export function PendingInvitesProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);
  const isMaster = user?.role === 'master';

  // Consulta ao entrar como master. "active" evita gravar depois de sair.
  useEffect(() => {
    if (!isMaster) {
      return;
    }
    let active = true;
    fetchPendingTotal()
      .then((total) => {
        if (active) {
          setPending(total);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isMaster]);

  // As telas chamam reload() depois de aceitar, recusar ou convidar.
  const reload = useCallback(async () => {
    if (!isMaster) {
      return;
    }
    try {
      setPending(await fetchPendingTotal());
    } catch {
      // Sem resposta, mantem o numero anterior.
    }
  }, [isMaster]);

  const count = isMaster ? pending : 0;
  const value = useMemo(() => ({ count, reload }), [count, reload]);

  return <PendingInvitesContext.Provider value={value}>{children}</PendingInvitesContext.Provider>;
}

export function usePendingInvites(): PendingInvitesValue {
  return useContext(PendingInvitesContext);
}
