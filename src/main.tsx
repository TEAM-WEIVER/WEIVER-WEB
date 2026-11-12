import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import 'pretendard/dist/web/variable/pretendardvariable.css';

import { ToastContainer } from '@/components/common/toast-container';
import MemberHomePage from '@/pages/home/page';
import LoginPage from '@/pages/login/page';
import NotFound from '@/pages/not-found';
import SignupAccountPage from '@/pages/signup/account-info/page';
import SignupAgreementsPage from '@/pages/signup/agreements/page';
import SignupLayout from '@/pages/signup/layout';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupLayout />}>
        <Route path="account-info" element={<SignupAccountPage />} />
        <Route path="agreements" element={<SignupAgreementsPage />} />
      </Route>
      <Route path="/home" element={<MemberHomePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <ToastContainer />
  </BrowserRouter>,
);
