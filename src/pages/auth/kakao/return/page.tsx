import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { AuthCard } from '@/components/common/auth-card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { KAKAO_SIGNUP_PATH, LOGIN_PATH, MEMBER_HOME_PATH } from '@/lib/auth-paths';
import {
  applyKakaoSession,
  clearKakaoSignup,
  exchangeKakaoLogin,
  getKakaoErrorMessage,
  saveKakaoSignup,
} from '@/lib/kakao-auth-flow';

interface ReturnNotice {
  message: string;
  signup?: boolean;
}

export default function KakaoReturnPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<ReturnNotice | null>(null);

  useEffect(() => {
    let active = true;
    void exchangeKakaoLogin().then(
      (result) => {
        if (!active) return;
        try {
          clearKakaoSignup();
          switch (result.status) {
            case 'LOGGED_IN':
              applyKakaoSession(result);
              navigate(MEMBER_HOME_PATH, { replace: true });
              return;
            case 'SIGNUP_REQUIRED':
              saveKakaoSignup(result);
              navigate(KAKAO_SIGNUP_PATH, { replace: true });
              return;
            case 'EXISTING_ACCOUNT':
              setNotice({
                message: `${result.verifiedEmail}로 가입한 계정이 있습니다. 기존 방식으로 로그인한 뒤 마이페이지에서 카카오 연결을 진행해주세요.`,
              });
              return;
            case 'PENDING_ACCOUNT':
              setNotice({
                message: `${result.verifiedEmail}의 이메일 가입이 완료되지 않았습니다. 이메일 회원가입을 다시 진행해주세요.`,
                signup: true,
              });
              return;
            default:
              throw new Error('카카오 로그인 결과를 확인할 수 없습니다. 다시 시작해주세요.');
          }
        } catch (error) {
          setNotice({ message: getKakaoErrorMessage(error) });
        }
      },
      (error: unknown) => {
        if (!active) return;
        clearKakaoSignup();
        setNotice({ message: getKakaoErrorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AuthCard title="카카오 로그인" description="카카오 인증 결과를 확인합니다.">
      {notice ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-body2 text-text-secondary break-words">
            {notice.message}
          </p>
          <Button asChild className="w-full">
            <Link to={notice.signup ? '/signup/account-info' : LOGIN_PATH} replace>
              {notice.signup ? '이메일로 회원가입' : '로그인으로 돌아가기'}
            </Link>
          </Button>
        </div>
      ) : (
        <p role="status" className="text-body2 text-text-secondary flex items-center gap-2">
          <Spinner size="sm" /> 로그인 확인 중
        </p>
      )}
    </AuthCard>
  );
}
