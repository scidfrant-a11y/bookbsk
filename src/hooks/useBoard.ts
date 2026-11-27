import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBoard } from '@/lib/bbApi';
import type { Board } from '@/lib/bbApi';

export default function useBoard(intervalMs = 10000) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const data = await fetchBoard();
      setBoard(data);
      setOffset(data.window.now - Date.now());
      setError('');
    } catch (e) {
      setError((e as Error).message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, intervalMs);
    return () => window.clearInterval(timer.current);
  }, [load, intervalMs]);

  return { board, loading, error, reload: load, offset };
}