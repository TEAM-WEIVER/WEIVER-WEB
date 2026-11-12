import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { expect, fn, userEvent, within, waitFor } from 'storybook/test';
import { useState } from 'react';
import { useTimer } from '@/hooks/use-timer';
import { EmailVerificationSection } from './email-verification-section';
const verification = {
  isEmailVerified: false,
  isSending: false,
  isVerifying: false,
  sendError: null,
  verifyError: null,
  verificationToken: '',
  verificationCode: '',
  isCodeSent: false,
  sendCount: 0,
  isSendLimitReached: false,
  timer: {
    seconds: 0,
    formatted: '00:00',
    isRunning: false,
    isExpired: false,
    start: fn(),
    reset: fn(),
  },
  sendVerification: fn(async () => {}),
  verifyCode: fn(async () => {}),
  updateVerificationCode: fn(),
};
const meta = {
  title: 'Auth/EmailVerificationSection',
  component: EmailVerificationSection,
  tags: ['autodocs'],
  args: { watchedEmail: 'demo@example.com', verification },
  render: function Controlled(args) {
    const form = useForm<{ email: string }>({ defaultValues: { email: args.watchedEmail } });
    return (
      <div className="w-full max-w-lg">
        <EmailVerificationSection
          {...args}
          emailInputProps={form.register('email')}
          watchedEmail={form.watch('email')}
        />
      </div>
    );
  },
} satisfies Meta<typeof EmailVerificationSection>;
export default meta;
type Story = StoryObj<typeof EmailVerificationSection>;
export const Default: Story = {};
export const Sending: Story = { args: { verification: { ...verification, isSending: true } } };
export const CodeSent: Story = {
  args: {
    verification: {
      ...verification,
      isCodeSent: true,
      timer: { ...verification.timer, seconds: 299, formatted: '04:59', isRunning: true },
    },
  },
};
export const Verified: Story = {
  args: { verification: { ...verification, isCodeSent: true, isEmailVerified: true } },
};
export const Expired: Story = {
  args: {
    verification: {
      ...verification,
      isCodeSent: true,
      timer: { ...verification.timer, isExpired: true },
    },
  },
};
export const SendFailure: Story = {
  args: { verification: { ...verification, sendError: '인증번호 전송에 실패했습니다.' } },
};

function InteractiveVerification({ seconds = 30 }: { seconds?: number }) {
  const form = useForm<{ email: string }>({ defaultValues: { email: 'demo@example.com' } });
  const timer = useTimer(seconds);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="w-full max-w-lg">
      <p className="text-body2 mb-4">
        화면 상태 전환 예시입니다. 실제 메일을 보내지 않습니다. 예시 코드: 123456
      </p>
      <EmailVerificationSection
        emailInputProps={form.register('email')}
        watchedEmail={form.watch('email')}
        verification={{
          ...verification,
          timer,
          isCodeSent: sent,
          isEmailVerified: verified,
          verificationCode: code,
          verifyError: error,
          sendVerification: async () => {
            setSent(true);
            setCode('');
            setError(null);
            timer.start();
          },
          updateVerificationCode: (value) => setCode(value.replace(/\D/g, '')),
          verifyCode: async () => {
            if (code === '123456') {
              setVerified(true);
              setError(null);
              timer.reset();
            } else setError('인증번호를 확인해주세요.');
          },
        }}
      />
    </div>
  );
}
export const VerificationFlow: Story = {
  render: () => <InteractiveVerification />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '인증번호 전송' }));
    await userEvent.type(canvas.getByRole('textbox', { name: '이메일 인증번호' }), '000000');
    await userEvent.click(canvas.getByRole('button', { name: '인증번호 확인' }));
    await expect(canvas.getByText('인증번호를 확인해주세요.')).toBeVisible();
    await userEvent.clear(canvas.getByRole('textbox', { name: '이메일 인증번호' }));
    await userEvent.type(canvas.getByRole('textbox', { name: '이메일 인증번호' }), '123456');
    await userEvent.click(canvas.getByRole('button', { name: '인증번호 확인' }));
    await expect(canvas.getByText('인증 완료')).toBeVisible();
  },
};
export const ExpiryAndResend: Story = {
  render: () => <InteractiveVerification seconds={2} />,
  parameters: {
    docs: {
      description: {
        story: '시각화용으로 2초 타이머를 사용합니다. 실제 인증 유효시간은 변경하지 않습니다.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '인증번호 전송' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: '재전송' })).toBeVisible(), {
      timeout: 4000,
    });
    await expect(canvas.getByRole('textbox', { name: '이메일 인증번호' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: '재전송' }));
    await expect(canvas.getByRole('textbox', { name: '이메일 인증번호' })).toBeEnabled();
  },
};
