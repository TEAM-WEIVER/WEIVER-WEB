import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { fn } from 'storybook/test';
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
