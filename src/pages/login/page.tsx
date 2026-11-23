import { LoginCard } from './_components/login-card';
import { useLoginForm } from './_hooks/use-login-form';
import { useKakaoLogin } from './_hooks/use-kakao-login';

export default function LoginPage() {
  const loginForm = useLoginForm();
  const kakao = useKakaoLogin();

  return <LoginCard {...loginForm} kakao={kakao} />;
}
