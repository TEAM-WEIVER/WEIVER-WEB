import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import 'pretendard/dist/web/variable/pretendardvariable.css';

import { ToastContainer } from '@/components/common/toast-container';
import {
  KAKAO_RETURN_PATH,
  KAKAO_SIGNUP_PATH,
  LOGIN_PATH,
  PASSWORD_RESET_PATH,
} from '@/lib/auth-paths';
import KakaoReturnPage from '@/pages/auth/kakao/return/page';
import MemberHomePage from '@/pages/home/page';
import InterviewPreparationPage from '@/pages/interview/preparation/page';
import LoginPage from '@/pages/login/page';
import PasswordResetPage from '@/pages/login/password-reset/page';
import NotFound from '@/pages/not-found';
import PreparationLayout from '@/pages/preparation/layout';
import {
  MasterResumeRoute,
  PreparationDetailRoute,
  PreparationDocumentRoute,
  PreparationEditRoute,
  PreparationListRoute,
  PreparationNewRoute,
} from '@/pages/preparation/routes';
import SignupAccountPage from '@/pages/signup/account-info/page';
import SignupAgreementsPage from '@/pages/signup/agreements/page';
import SignupLayout from '@/pages/signup/layout';
import KakaoSignupPage from '@/pages/signup/kakao/page';
import ServiceLayout from '@/pages/service/layout';
import { PolicyPage } from '@/pages/service/policy-page';
import SupportPage from '@/pages/service/support-page';
import { TERMS_PATH, PRIVACY_PATH, SUPPORT_PATH } from '@/lib/service-paths';
import '@/styles/globals.css';

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
    const { startMockApi } = await import('@/mocks/browser');
    await startMockApi();
  }
  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <Routes>
        <Route path={LOGIN_PATH} element={<LoginPage />} />
        <Route path={PASSWORD_RESET_PATH} element={<PasswordResetPage />} />
        <Route path={KAKAO_RETURN_PATH} element={<KakaoReturnPage />} />
        <Route path={KAKAO_SIGNUP_PATH} element={<KakaoSignupPage />} />
        <Route path="/signup" element={<SignupLayout />}>
          <Route path="account-info" element={<SignupAccountPage />} />
          <Route path="agreements" element={<SignupAgreementsPage />} />
        </Route>
        <Route path="/home" element={<MemberHomePage />} />
        <Route
          path="/preparation/:postingId/interview/prepare"
          element={<InterviewPreparationPage />}
        />
        <Route element={<PreparationLayout />}>
          <Route path="/resume/master" element={<MasterResumeRoute />} />
          <Route path="/preparation" element={<PreparationListRoute />} />
          <Route path="/preparation/new" element={<PreparationNewRoute />} />
          <Route path="/preparation/:postingId" element={<PreparationDetailRoute />} />
          <Route path="/preparation/:postingId/edit" element={<PreparationEditRoute />} />
          <Route
            path="/preparation/:postingId/resume"
            element={<PreparationDocumentRoute key="resume" document="resume" />}
          />
          <Route
            path="/preparation/:postingId/cover-letter"
            element={<PreparationDocumentRoute key="cover-letter" document="cover-letter" />}
          />
          <Route
            path="/preparation/:postingId/portfolio"
            element={<PreparationDocumentRoute key="portfolio" document="portfolio" />}
          />
        </Route>
        <Route element={<ServiceLayout />}>
          <Route path={TERMS_PATH} element={<PolicyPage kind="terms" />} />
          <Route path={PRIVACY_PATH} element={<PolicyPage kind="privacy" />} />
          <Route path={SUPPORT_PATH} element={<SupportPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>,
  );
}
void bootstrap().catch((error) => {
  console.error('앱 시작 실패', error);
  const root = document.getElementById('root');
  if (root) root.textContent = '앱을 시작하지 못했어요. 새로고침해주세요.';
});
