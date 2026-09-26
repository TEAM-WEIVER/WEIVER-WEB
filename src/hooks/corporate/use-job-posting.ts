'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createJobPosting,
  deleteJobPosting,
  getJobPosting,
  updateJobPosting,
} from '@/services/corporate/job-posting';
import type { JobPostingResponse } from '@/schemas/corporate/job-posting';

/* ─── useJobPosting ─── */

export function useJobPosting(jdId: number) {
  const [data, setData] = useState<JobPostingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const isValidJdId = Number.isInteger(jdId) && jdId > 0;

  const refetch = useCallback(() => {
    setIsLoading(true);
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!isValidJdId)
      return () => {
        cancelled = true;
      };

    getJobPosting(jdId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch job posting'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isValidJdId, jdId, requestVersion]);

  return {
    data: isValidJdId ? data : null,
    isLoading: isValidJdId ? isLoading : false,
    error: isValidJdId ? error : new Error('Invalid job posting id'),
    refetch,
  };
}

/* ─── useCreateJobPosting ─── */

export function useCreateJobPosting() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: FormData, isTemp?: boolean) => {
    setIsPending(true);
    setError(null);
    try {
      await createJobPosting(data, isTemp);
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to create job posting');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

/* ─── useUpdateJobPosting ─── */

export function useUpdateJobPosting() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (jdId: number, data: FormData) => {
    setIsPending(true);
    setError(null);
    try {
      await updateJobPosting(jdId, data);
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to update job posting');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

/* ─── useDeleteJobPosting ─── */

export function useDeleteJobPosting() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (jdId: number) => {
    setIsPending(true);
    setError(null);
    try {
      await deleteJobPosting(jdId);
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to delete job posting');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
