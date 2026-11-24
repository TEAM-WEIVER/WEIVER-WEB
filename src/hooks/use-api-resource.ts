import { useCallback, useEffect, useState } from 'react';

export type ApiResourceState<Data> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: Data };

/** 재시도·화면 이탈 시 이전 요청을 취소해 늦은 응답이 현재 화면을 덮지 않게 한다. */
export function useApiResource<Data>(load: (signal?: AbortSignal) => Promise<Data>) {
  const [state, setState] = useState<ApiResourceState<Data>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  return { state, retry };
}
