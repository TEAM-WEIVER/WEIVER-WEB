import { LoginCard } from './_components/login-card';
import { LoginForm } from './_components/login-form';
import { useLoginForm } from './_hooks/use-login-form';

export default function LoginPage() {
  const loginForm = useLoginForm();

  return (
    <LoginCard>
      <LoginForm {...loginForm} />
    </LoginCard>
  );
}
