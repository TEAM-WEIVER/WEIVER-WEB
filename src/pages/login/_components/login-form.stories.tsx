import { type ComponentProps, useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageCircle } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { expect, fn } from 'storybook/test';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { LoginCard } from './login-card';
import { LoginForm } from './login-form';

type StoryArgs = ComponentProps<typeof LoginForm> & { rememberLogin: boolean };

const filledCredentials = { email: 'weiver@gmail.com', password: 'abcdefghigk' };

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    rememberLogin: false,
    showPassword: false,
    email: '',
    password: '',
    loginError: null,
    isSubmitting: false,
    isFormValid: false,
    setEmail: fn(),
    setPassword: fn(),
    setShowPassword: fn(),
    handleSubmit: async (event) => event.preventDefault(),
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: function Controlled({ rememberLogin, ...args }) {
    const [email, setEmail] = useState(args.email);
    const [password, setPassword] = useState(args.password);
    const [showPassword, setShowPassword] = useState(args.showPassword);
    const rememberLoginId = useId();

    return (
      <LoginCard>
        <LoginForm
          {...args}
          email={email}
          password={password}
          showPassword={showPassword}
          setEmail={setEmail}
          setPassword={setPassword}
          setShowPassword={setShowPassword}
          isFormValid={email.trim() !== '' && password.trim() !== ''}
          formOptions={
            <div className="text-caption text-text-secondary flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={rememberLoginId} className="flex items-center gap-2">
                <Checkbox
                  id={rememberLoginId}
                  className="size-[21px]"
                  defaultChecked={rememberLogin}
                />
                로그인 정보 저장
              </label>
              <span className="underline underline-offset-2">비밀번호를 잊으셨나요?</span>
            </div>
          }
        />

        <div className="text-caption text-text-tertiary before:bg-border-default after:bg-border-default my-8 flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1">
          또는
        </div>
        <Button
          type="button"
          className="w-full bg-[#fee500] text-black hover:bg-[#fee500] disabled:bg-[#fee500] disabled:text-black"
          disabled
        >
          <MessageCircle aria-hidden="true" className="fill-current" />
          카카오로 시작하기
        </Button>
      </LoginCard>
    );
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Filled: Story = {
  args: filledCredentials,
  play: async ({ canvas, userEvent }) => {
    const password = canvas.getByLabelText('비밀번호', { exact: true });
    await expect(password).toHaveAttribute('type', 'password');

    const toggle = canvas.getByRole('button', { name: '비밀번호 보기' });
    toggle.focus();
    await userEvent.keyboard(' ');
    await expect(password).toHaveAttribute('type', 'text');
    await expect(canvas.getByRole('button', { name: '비밀번호 숨기기' })).toHaveFocus();

    await userEvent.keyboard(' ');
    await expect(password).toHaveAttribute('type', 'password');
  },
};

export const PasswordVisible: Story = {
  args: { ...filledCredentials, showPassword: true, rememberLogin: true },
};

export const Submitting: Story = {
  args: { ...filledCredentials, isSubmitting: true },
};

export const Failed: Story = {
  args: { ...PasswordVisible.args, loginError: 'credentials' },
};
