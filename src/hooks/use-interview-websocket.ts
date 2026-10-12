'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Client, type IMessage, type IFrame } from '@stomp/stompjs';
import { useRouter } from 'next/navigation';

import { useInterviewStore } from '@/store/interview-store';
import type { InterviewMessage, QuestionReadyPayload } from '@/store/interview-store';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

export function normalizeBrokerUrl(url: string | undefined): string {
  const fallbackUrl = 'wss://api.piuda.site/ws';
  const value = url?.trim() || fallbackUrl;

  if (value.startsWith('https://')) {
    return value.replace(/^https:\/\//, 'wss://');
  }

  if (value.startsWith('http://')) {
    return value.replace(/^http:\/\//, 'ws://');
  }

  return value;
}

const BROKER_URL = normalizeBrokerUrl(process.env.NEXT_PUBLIC_WS_URL);

const SUBSCRIBE_DEST = '/user/queue/interviews';
const START_DEST = '/app/interviews/start';

/** AC6: 지수 백오프 재시도 대기 시간 (ms) */
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;
const SUBSCRIBE_RECEIPT_FALLBACK_MS = 1000;
const START_RESPONSE_TIMEOUT_MS = 15000;

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────

export function useInterviewWebSocket() {
  const router = useRouter();
  const {
    status,
    interviewSessionId,
    setStatus,
    setSessionStarted,
    setQuestion,
    setAnswerAccepted,
    setError,
    setFinished,
  } = useInterviewStore();

  const clientRef = useRef<Client | null>(null);

  /**
   * AC5-a: onStompError 발생 시 이후 소켓 close가
   * AC6 재연결 루프를 트리거하지 않도록 차단하는 플래그
   */
  const stompErrorFiredRef = useRef(false);
  const finishedRef = useRef(false);

  /** AC6: 현재 재시도 횟수 */
  const retryCountRef = useRef(0);

  /** AC6: 재연결 타이머 */
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribeReceiptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startResponseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 이전 활성 상태 (재연결 성공 시 복구용) */
  const prevStatusRef = useRef<'SUBSCRIBED' | 'QUESTION' | 'SUBMITTING' | null>(null);

  // ──────────────────────────────────────────────
  // 내부 유틸
  // ──────────────────────────────────────────────

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearSubscribeReceiptTimer = useCallback(() => {
    if (subscribeReceiptTimerRef.current) {
      clearTimeout(subscribeReceiptTimerRef.current);
      subscribeReceiptTimerRef.current = null;
    }
  }, []);

  const clearStartResponseTimer = useCallback(() => {
    if (startResponseTimerRef.current) {
      clearTimeout(startResponseTimerRef.current);
      startResponseTimerRef.current = null;
    }
  }, []);

  /**
   * 재연결 시도. reconnectDelay가 0이면 소켓이 닫혀도 stompjs 상태가 ACTIVE로 남아
   * `activate()`가 "Already ACTIVE"로 무시된다. 먼저 INACTIVE로 되돌린 뒤 다시 활성화한다.
   */
  const reactivateClient = useCallback((client: Client) => {
    void client.deactivate().then(() => {
      if (finishedRef.current || clientRef.current !== client) return;
      client.activate();
    });
  }, []);

  /**
   * AC6: 재시도 횟수를 모두 쓰면 ERROR로 바꾸고 클라이언트도 비활성화한다.
   * reconnectDelay 0이라 stompjs가 ACTIVE로 남아 있으므로 명시적으로 deactivate한다.
   */
  const giveUpReconnect = useCallback(
    (client: Client) => {
      clearRetryTimer();
      prevStatusRef.current = null;
      setError('연결이 끊겼습니다. 면접이 중단되었습니다.');
      void client.deactivate();
    },
    [clearRetryTimer, setError],
  );

  /**
   * #119: 정상 종료·인증 만료 등으로 연결을 끝낸다.
   * 종료 플래그를 먼저 세워 이후 onWebSocketClose가 재연결 타이머를 걸지 않게 한다.
   */
  const disconnect = useCallback(() => {
    finishedRef.current = true;
    clearRetryTimer();
    clearSubscribeReceiptTimer();
    clearStartResponseTimer();
    prevStatusRef.current = null;
    void clientRef.current?.deactivate();
  }, [clearRetryTimer, clearStartResponseTimer, clearSubscribeReceiptTimer]);

  /** #119: 현재 세션이면 완료 화면(FINISHED)으로 바꾸고 연결을 끝낸다. */
  const finishInterview = useCallback(
    (sessionId: string) => {
      if (!setFinished(sessionId)) return false;
      disconnect();
      return true;
    },
    [disconnect, setFinished],
  );

  const isActiveStatus = useCallback(() => {
    const s = useInterviewStore.getState().status;
    return s === 'SUBSCRIBED' || s === 'QUESTION' || s === 'SUBMITTING' || s === 'RECONNECTING';
  }, []);

  // ──────────────────────────────────────────────
  // 메시지 핸들러
  // ──────────────────────────────────────────────

  const handleMessage = useCallback(
    (msg: IMessage) => {
      let payload: InterviewMessage;
      try {
        payload = JSON.parse(msg.body) as InterviewMessage;
      } catch {
        return;
      }

      switch (payload.type) {
        case 'SESSION_STARTED':
          clearStartResponseTimer();
          // session ID 저장 후 QUESTION_READY 대기 (SUBSCRIBED 로딩 화면 유지)
          setSessionStarted(payload.interview_session_id);
          break;

        case 'QUESTION_READY':
          setQuestion(payload as QuestionReadyPayload);
          break;

        case 'ANSWER_ACCEPTED':
          // 현재 질문의 수락일 때만 다음 QUESTION_READY 대기(SUBSCRIBED)로 전환 (#119 AC4)
          setAnswerAccepted({
            sessionId: payload.interview_session_id,
            questionCode: payload.question_code,
            sequence: payload.sequence,
          });
          break;

        case 'INTERVIEW_FINISHED':
          finishInterview(payload.interview_session_id);
          break;
      }
    },
    [clearStartResponseTimer, finishInterview, setSessionStarted, setQuestion, setAnswerAccepted],
  );

  // ──────────────────────────────────────────────
  // 연결 시작 (connect)
  // ──────────────────────────────────────────────

  const connect = useCallback(
    (token: string) => {
      // 이미 연결 중이면 무시
      if (clientRef.current?.active) return;

      stompErrorFiredRef.current = false;
      finishedRef.current = false;
      retryCountRef.current = 0;
      clearSubscribeReceiptTimer();
      clearStartResponseTimer();

      const publishStart = (client: Client) => {
        client.publish({
          destination: START_DEST,
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ interview_type: 'TECHNICAL' }),
        });

        clearStartResponseTimer();
        startResponseTimerRef.current = setTimeout(() => {
          if (!useInterviewStore.getState().interviewSessionId) {
            setError('면접 세션 시작 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
            void client.deactivate();
          }
        }, START_RESPONSE_TIMEOUT_MS);
      };

      const client = new Client({
        brokerURL: BROKER_URL,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        // AC6: reconnectDelay 0으로 설정 — 재연결은 beforeConnect에서 직접 제어
        reconnectDelay: 0,

        onConnect: () => {
          const isReconnect = retryCountRef.current > 0 || prevStatusRef.current !== null;

          // 재연결 성공 시 카운터 초기화
          retryCountRef.current = 0;
          clearRetryTimer();
          clearSubscribeReceiptTimer();
          stompErrorFiredRef.current = false;

          // 구독 (재연결 후에도 반드시 재구독 필요)
          const receiptId = `interview-subscribe-${Date.now()}`;
          let startPublished = false;

          const publishStartOnce = () => {
            if (startPublished || isReconnect) return;
            startPublished = true;
            clearSubscribeReceiptTimer();
            publishStart(client);
          };

          client.watchForReceipt(receiptId, publishStartOnce);
          client.subscribe(SUBSCRIBE_DEST, handleMessage, { receipt: receiptId });

          if (isReconnect) {
            // 재연결: SUBSCRIBED를 거치지 않고 이전 상태로 한 번에 복구, start publish 스킵 (#119)
            const prev = prevStatusRef.current;
            prevStatusRef.current = null;
            setStatus(prev ?? 'SUBSCRIBED');
          } else {
            setStatus('SUBSCRIBED');
            // receipt 미지원 서버에서도 멈추지 않도록 짧은 fallback 이후 시작 요청
            subscribeReceiptTimerRef.current = setTimeout(
              publishStartOnce,
              SUBSCRIBE_RECEIPT_FALLBACK_MS,
            );
          }
        },

        // AC5-a: STOMP ERROR 프레임 처리
        onStompError: (frame: IFrame) => {
          stompErrorFiredRef.current = true;
          clearRetryTimer();
          clearSubscribeReceiptTimer();
          clearStartResponseTimer();

          const errorMsg =
            frame.headers['message'] ??
            (typeof frame.body === 'string'
              ? (() => {
                  try {
                    return (JSON.parse(frame.body) as { message?: string }).message;
                  } catch {
                    return undefined;
                  }
                })()
              : undefined) ??
            '면접을 시작할 수 없습니다. 다시 시도해 주세요.';

          // AC5: 인증 오류 감지 시 /login 리다이렉트
          const isAuthError =
            String(errorMsg).toLowerCase().includes('unauthorized') ||
            String(frame.headers['message'] ?? '')
              .toLowerCase()
              .includes('unauthorized');

          setError(String(errorMsg));

          // deactivate 후 소켓 close 이벤트가 AC6를 트리거하지 않도록 차단
          void client.deactivate();

          if (isAuthError) {
            router.replace('/login');
          }
        },

        onWebSocketClose: () => {
          // 정상 종료 처리로 발생한 close에서는 재연결하지 않는다.
          if (finishedRef.current) return;

          // AC5-a: STOMP ERROR로 인한 close는 재연결 제외.
          // onStompError가 이미 ERROR로 바꿨으므로 상태를 덮어쓰지 않는다(오류 배너 유지).
          if (stompErrorFiredRef.current) {
            stompErrorFiredRef.current = false;
            return;
          }

          // 활성 상태가 아니면 재연결 불필요
          if (!isActiveStatus()) return;

          // AC6: 재연결 흐름
          if (retryCountRef.current >= MAX_RETRIES) {
            giveUpReconnect(client);
            return;
          }

          // 이전 활성 상태 저장
          const current = useInterviewStore.getState().status;
          if (current === 'SUBSCRIBED' || current === 'QUESTION' || current === 'SUBMITTING') {
            prevStatusRef.current = current;
          }

          setStatus('RECONNECTING');

          const delay = RETRY_DELAYS[retryCountRef.current] ?? 4000;
          retryCountRef.current += 1;

          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (retryCountRef.current > MAX_RETRIES) {
              giveUpReconnect(client);
              return;
            }
            // stompjs activate로 재연결 시도
            reactivateClient(client);
          }, delay);
        },

        onWebSocketError: () => {
          // STOMP ERROR가 이미 처리한 경우 무시
          if (stompErrorFiredRef.current) return;

          // 활성 상태가 아닐 때(최초 연결 실패)만 ERROR로 전이
          const current = useInterviewStore.getState().status;
          if (current === 'CONNECTING') {
            setError('면접을 시작할 수 없습니다. 다시 시도해 주세요.');
            void client.deactivate();
          }
        },
      });

      clientRef.current = client;
      setStatus('CONNECTING');
      client.activate();
    },
    [
      clearRetryTimer,
      clearStartResponseTimer,
      clearSubscribeReceiptTimer,
      giveUpReconnect,
      handleMessage,
      isActiveStatus,
      reactivateClient,
      router,
      setError,
      setStatus,
    ],
  );

  // ──────────────────────────────────────────────
  // AC8: visibilitychange — 탭 복귀 시 소켓 상태 확인
  // ──────────────────────────────────────────────

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;

      const current = useInterviewStore.getState().status;
      if (current === 'IDLE' || current === 'FINISHED' || current === 'ERROR') return;

      const client = clientRef.current;
      if (!client) return;

      // 연결이 살아 있으면 아무 작업 없음
      if (client.connected) return;

      // 소켓이 끊긴 경우 재연결 흐름 시작
      if (current === 'SUBSCRIBED' || current === 'QUESTION' || current === 'SUBMITTING') {
        if (retryCountRef.current >= MAX_RETRIES) {
          giveUpReconnect(client);
          return;
        }

        prevStatusRef.current = current;
        setStatus('RECONNECTING');

        // 겹치는 재시도 타이머가 재시도 예산을 중복으로 쓰지 않도록 기존 타이머를 먼저 정리한다
        clearRetryTimer();
        const delay = RETRY_DELAYS[retryCountRef.current] ?? 4000;
        retryCountRef.current += 1;

        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          reactivateClient(client);
        }, delay);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearRetryTimer, giveUpReconnect, reactivateClient, setStatus]);

  // ──────────────────────────────────────────────
  // 언마운트 시 정리
  // ──────────────────────────────────────────────

  useEffect(() => {
    // 종료 플래그를 먼저 세워 deactivate 대기 중 close·reactivate가 재연결하지 않게 한다
    return disconnect;
  }, [disconnect]);

  // ──────────────────────────────────────────────
  // 연결 여부 확인 (외부 노출)
  // ──────────────────────────────────────────────

  const isConnected = useCallback(() => {
    return clientRef.current?.connected ?? false;
  }, []);

  return {
    connect,
    disconnect,
    finishInterview,
    isConnected,
    status,
    interviewSessionId,
  };
}
