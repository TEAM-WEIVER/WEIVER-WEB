'use client';

import { useEffect, useState } from 'react';

import {
  getAiSummary,
  getCardSummary,
  getCultureFit,
  getDocumentSummary,
  getSkillFit,
} from '@/services/corporate/report';
import type {
  AiSummary,
  CardSummary,
  CultureFit,
  DocumentSummary,
  SkillFit,
} from '@/schemas/corporate/report';

type ReportQueryOptions = {
  enabled?: boolean;
};

function isValidReportTarget(jdId: number, applicantPublicId: string) {
  return Number.isFinite(jdId) && jdId > 0 && applicantPublicId.trim().length > 0;
}

function useReportQuery<TData>(
  jdId: number,
  applicantPublicId: string,
  fetcher: (jdId: number, applicantPublicId: string) => Promise<{ data: TData }>,
  errorMessage: string,
  options: ReportQueryOptions = {},
) {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve()
      .then(() => {
        if (cancelled) return null;

        setIsLoading(true);

        if (!isValidReportTarget(jdId, applicantPublicId)) {
          throw new Error('Invalid report target');
        }

        return fetcher(jdId, applicantPublicId);
      })
      .then((res) => {
        if (!cancelled && res) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(errorMessage));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicantPublicId, enabled, errorMessage, fetcher, jdId]);

  return { data: enabled ? data : null, isLoading: enabled ? isLoading : false, error };
}

export function useCardSummary(
  jdId: number,
  applicantPublicId: string,
  options?: ReportQueryOptions,
) {
  return useReportQuery<CardSummary>(
    jdId,
    applicantPublicId,
    getCardSummary,
    'Failed to fetch card summary',
    options,
  );
}

export function useAiSummary(
  jdId: number,
  applicantPublicId: string,
  options?: ReportQueryOptions,
) {
  return useReportQuery<AiSummary>(
    jdId,
    applicantPublicId,
    getAiSummary,
    'Failed to fetch AI summary',
    options,
  );
}

export function useSkillFit(jdId: number, applicantPublicId: string, options?: ReportQueryOptions) {
  return useReportQuery<SkillFit>(
    jdId,
    applicantPublicId,
    getSkillFit,
    'Failed to fetch skill fit',
    options,
  );
}

export function useCultureFit(
  jdId: number,
  applicantPublicId: string,
  options?: ReportQueryOptions,
) {
  return useReportQuery<CultureFit>(
    jdId,
    applicantPublicId,
    getCultureFit,
    'Failed to fetch culture fit',
    options,
  );
}

export function useDocumentSummary(
  jdId: number,
  applicantPublicId: string,
  options?: ReportQueryOptions,
) {
  return useReportQuery<DocumentSummary>(
    jdId,
    applicantPublicId,
    getDocumentSummary,
    'Failed to fetch document summary',
    options,
  );
}
