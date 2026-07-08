'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getApplicants,
  getApplicantDetail,
  sendContactMail,
} from '@/services/corporate/applicant';
import type { ApplicantListResponse, ApplicantDetail } from '@/schemas/corporate/applicant';

/* ─── useApplicants ─── */

interface ApplicantsParams {
  keyword?: string;
  skillScoreMin?: number;
  cultureStyle?: string;
  techStacks?: string[];
  page?: number;
  size?: number;
}

export function useApplicants(jdId: number, params?: ApplicantsParams) {
  const [data, setData] = useState<ApplicantListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const keyword = params?.keyword;
  const skillScoreMin = params?.skillScoreMin;
  const cultureStyle = params?.cultureStyle;
  const techStacks = params?.techStacks;
  const page = params?.page;
  const size = params?.size;

  useEffect(() => {
    let cancelled = false;

    getApplicants(jdId, { keyword, skillScoreMin, cultureStyle, techStacks, page, size })
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch applicants'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdId, keyword, skillScoreMin, cultureStyle, page, size, JSON.stringify(techStacks)]);

  return { data, isLoading, error };
}

/* ─── useApplicantDetail ─── */

export function useApplicantDetail(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<ApplicantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getApplicantDetail(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch applicant detail'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jdId, applicantPublicId]);

  return { data, isLoading, error };
}

/* ─── useSendContactMail ─── */

export function useSendContactMail() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (jdId: number, applicantPublicId: string) => {
    setIsPending(true);
    setError(null);
    try {
      await sendContactMail(jdId, applicantPublicId);
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error('Failed to send contact mail');
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
