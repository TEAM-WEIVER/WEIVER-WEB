import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { SignupAgreementsForm } from '@/pages/signup/_components/signup-agreements-form';
import { LOGIN_PATH } from '@/lib/auth-paths';
import { clearAccessToken } from '@/lib/auth-token';
import { completeSignup } from '@/lib/signup-api';
import { getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { useSignupStore } from '@/store/signup-store';

export default function SignupAgreementsPage() {
  const navigate = useNavigate();
  const account = useSignupStore((state) => state.account);
  const savedTerms = useSignupStore((state) => state.terms);
  const reset = useSignupStore((state) => state.reset);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSignupCompleted, setIsSignupCompleted] = useState(false);

  useEffect(() => {
    if (!account.signupToken && !isSignupCompleted) {
      navigate('/signup/account-info', { replace: true });
    }
  }, [account.signupToken, isSignupCompleted, navigate]);

  if (!account.signupToken) return null;
  const prevStep = getPrevStep('agreements');

  return (
    <SignupAgreementsForm
      defaultTerms={savedTerms}
      description={`${getStepNumber('agreements')}단계 · 정보 수집 및 이용에 대한 약관에 동의해주세요.`}
      error={submitError}
      onBack={() => navigate(prevStep ? `/signup/${prevStep}` : LOGIN_PATH)}
      onComplete={async (terms) => {
        setSubmitError(null);
        try {
          await completeSignup({ account, terms });
          clearAccessToken();
          setIsSignupCompleted(true);
          reset();
          navigate(LOGIN_PATH, { replace: true });
        } catch {
          setSubmitError('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
      }}
    />
  );
}
