'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getDashboardJobPostings,
  getCompanyDashboard,
  getNotifications,
  readAllNotifications,
  readNotification,
} from '@/services/corporate/dashboard';
import type {
  CompanyDashboard,
  JobPostingsSummary,
  JobPostingStatus,
  Notification,
} from '@/schemas/corporate/dashboard';

/* ─── useCompanyDashboard ─── */

export function useCompanyDashboard() {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCompanyDashboard()
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch company dashboard'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

/* ─── useDashboardJobPostings ─── */

interface DashboardJobPostingsParams {
  status?: JobPostingStatus;
  page?: number;
  size?: number;
}

export function useDashboardJobPostings(params?: DashboardJobPostingsParams) {
  const [data, setData] = useState<JobPostingsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const status = params?.status;
  const page = params?.page;
  const size = params?.size;

  useEffect(() => {
    let cancelled = false;

    getDashboardJobPostings({ status, page, size })
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch job postings'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, page, size]);

  return { data, isLoading, error };
}

/* ─── useNotifications ─── */

export function useNotifications() {
  const [data, setData] = useState<Record<string, Notification[]> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getNotifications()
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

/* ─── useReadNotification ─── */

export function useReadNotification() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (notificationId: number) => {
    setIsPending(true);
    setError(null);
    try {
      await readNotification(notificationId);
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to read notification');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

/* ─── useReadAllNotifications ─── */

export function useReadAllNotifications() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      await readAllNotifications();
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to read all notifications');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
