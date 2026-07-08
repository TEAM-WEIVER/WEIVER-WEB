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

/* ─── useCardSummary ─── */

export function useCardSummary(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<CardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCardSummary(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch card summary'));
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

/* ─── useAiSummary ─── */

export function useAiSummary(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<AiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAiSummary(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch AI summary'));
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

/* ─── useSkillFit ─── */

export function useSkillFit(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<SkillFit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSkillFit(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch skill fit'));
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

/* ─── useCultureFit ─── */

export function useCultureFit(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<CultureFit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCultureFit(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch culture fit'));
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

/* ─── useDocumentSummary ─── */

export function useDocumentSummary(jdId: number, applicantPublicId: string) {
  const [data, setData] = useState<DocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDocumentSummary(jdId, applicantPublicId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch document summary'));
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
