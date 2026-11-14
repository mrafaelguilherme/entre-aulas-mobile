import { act, renderHook } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { Paginated } from '../../types';
import { usePaginatedList } from '../usePaginatedList';

type Item = { id: string };

// Monta uma pagina como a API devolve.
function page(ids: string[], total: number, pageNumber = 1): Paginated<Item> {
  return { items: ids.map((id) => ({ id })), page: pageNumber, limit: 20, total };
}

const networkError = new AxiosError('Network Error', 'ERR_NETWORK');

describe('usePaginatedList', () => {
  it('does not fetch until refresh is called', async () => {
    const fetchPage = jest.fn();
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.status).toBe('loading');
  });

  it('goes to ready with the first page after refresh', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page(['a', 'b'], 5));
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    expect(fetchPage).toHaveBeenCalledWith(1);
    expect(result.current.status).toBe('ready');
    expect(result.current.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
  });

  it('goes to error, not empty, when the first page fails', async () => {
    const fetchPage = jest.fn().mockRejectedValue(networkError);
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Não foi possível conectar à API.');
    expect(result.current.items).toEqual([]);
  });

  it('goes to empty when total is 0', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page([], 0));
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    expect(result.current.status).toBe('empty');
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore appends the next page and removes repeated ids', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a', 'b'], 4))
      .mockResolvedValueOnce(page(['b', 'c', 'd'], 4, 2));
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    await act(() => result.current.loadMore());
    expect(fetchPage).toHaveBeenLastCalledWith(2);
    expect(result.current.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.current.hasMore).toBe(false);
  });

  it('hasMore is false when items.length reaches total, and loadMore stops fetching', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page(['a', 'b'], 2));
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    expect(result.current.hasMore).toBe(false);
    await act(() => result.current.loadMore());
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('refresh restarts from page 1', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], 2))
      .mockResolvedValueOnce(page(['b'], 2, 2))
      .mockResolvedValueOnce(page(['z'], 1));
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    await act(() => result.current.loadMore());
    await act(() => result.current.refresh());
    expect(fetchPage).toHaveBeenLastCalledWith(1);
    expect(result.current.items.map((item) => item.id)).toEqual(['z']);
    expect(result.current.refreshing).toBe(false);
  });

  it('a failed loadMore keeps the loaded items and reports the error', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], 3))
      .mockRejectedValueOnce(networkError);
    const { result } = await renderHook(() => usePaginatedList(fetchPage));
    await act(() => result.current.refresh());
    await act(() => result.current.loadMore());
    expect(result.current.status).toBe('ready');
    expect(result.current.items.map((item) => item.id)).toEqual(['a']);
    expect(result.current.error).toBe('Não foi possível conectar à API.');
  });

  it('uses the latest fetch function on the next refresh', async () => {
    const listAll = jest.fn().mockResolvedValue(page(['a'], 1));
    const search = jest.fn().mockResolvedValue(page(['s'], 1));
    const { result, rerender } = await renderHook(
      ({ fetchPage }: { fetchPage: (page: number) => Promise<Paginated<Item>> }) =>
        usePaginatedList(fetchPage),
      { initialProps: { fetchPage: listAll } },
    );
    await act(() => result.current.refresh());
    await rerender({ fetchPage: search });
    await act(() => result.current.refresh());
    expect(search).toHaveBeenCalledWith(1);
    expect(result.current.items.map((item) => item.id)).toEqual(['s']);
  });
});
