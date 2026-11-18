import { LoginCard } from './_components/login-card';
import { useLoginForm } from './_hooks/use-login-form';

export default function LoginPage() {
  const loginForm = useLoginForm();

  return <LoginCard {...loginForm} />;
}
