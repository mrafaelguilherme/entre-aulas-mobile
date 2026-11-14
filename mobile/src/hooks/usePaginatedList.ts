import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import { Paginated } from '../types';

export type ListStatus = 'loading' | 'ready' | 'empty' | 'error';

// Controla uma lista paginada da API: primeira pagina, puxar para atualizar
// e carregar mais. O hook nunca busca sozinho: a tela chama refresh()
// quando ganha foco. Assim, abrir a tela gera uma so requisicao.
export function usePaginatedList<T extends { id: string }>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Refs guardam valores que as funcoes leem sem precisar ser recriadas.
  // A funcao de busca mais recente fica guardada depois de cada renderizacao.
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });
  const itemsRef = useRef<T[]>([]);
  const totalRef = useRef(0);
  const pageRef = useRef(0);
  const busy = useRef(false);

  const apply = useCallback((nextItems: T[], total: number) => {
    itemsRef.current = nextItems;
    totalRef.current = total;
    setItems(nextItems);
    setHasMore(nextItems.length < total);
  }, []);

  const refresh = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    // Com itens na tela, mostra o giro de "puxar para atualizar" em vez de esvaziar a lista.
    if (itemsRef.current.length > 0) {
      setRefreshing(true);
    } else {
      setStatus('loading');
    }
    try {
      const result = await fetchRef.current(1);
      pageRef.current = 1;
      apply(result.items, result.total);
      setError(null);
      setStatus(result.total === 0 ? 'empty' : 'ready');
    } catch (cause) {
      setError(getErrorMessage(cause));
      setStatus('error');
    } finally {
      setRefreshing(false);
      busy.current = false;
    }
  }, [apply]);

  const loadMore = useCallback(async () => {
    if (busy.current || itemsRef.current.length >= totalRef.current) {
      return;
    }
    busy.current = true;
    try {
      const result = await fetchRef.current(pageRef.current + 1);
      pageRef.current += 1;
      // Remove ids repetidos: um item novo pode empurrar outro para a pagina seguinte.
      const known = new Set(itemsRef.current.map((item) => item.id));
      const fresh = result.items.filter((item) => !known.has(item.id));
      apply([...itemsRef.current, ...fresh], result.total);
      setError(null);
    } catch (cause) {
      // A lista ja carregada continua na tela; so o rodape avisa.
      setError(getErrorMessage(cause));
    } finally {
      busy.current = false;
    }
  }, [apply]);

  return { items, status, error, refreshing, hasMore, refresh, loadMore };
}
