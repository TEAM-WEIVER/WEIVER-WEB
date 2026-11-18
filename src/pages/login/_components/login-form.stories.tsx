import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, fn } from 'storybook/test';

import { PASSWORD_RESET_PATH } from '@/lib/auth-paths';

import { LoginCard } from './login-card';

const filledCredentials = { email: 'weiver@gmail.com', password: 'abcdefghigk' };

const meta = {
  title: 'Auth/LoginForm',
  component: LoginCard,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    rememberEmail: false,
    defaultPasswordVisible: false,
    email: '',
    password: '',
    loginError: null,
    isSubmitting: false,
    setEmail: fn(),
    setPassword: fn(),
    setRememberEmail: fn(),
    handleSubmit: async (event) => event.preventDefault(),
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: function Controlled(args) {
    const [email, setEmail] = useState(args.email);
    const [password, setPassword] = useState(args.password);
    const [rememberEmail, setRememberEmail] = useState(args.rememberEmail);

    return (
      <LoginCard
        {...args}
        email={email}
        password={password}
        rememberEmail={rememberEmail}
        setEmail={setEmail}
        setPassword={setPassword}
        setRememberEmail={setRememberEmail}
      />
    );
  },
} satisfies Meta<typeof LoginCard>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const remember = canvas.getByRole('checkbox', { name: '로그인 정보 저장' });
    await expect(remember).not.toBeChecked();
    await userEvent.click(remember);
    await expect(remember).toBeChecked();
    await userEvent.click(remember);
    await expect(canvas.getByRole('link', { name: '비밀번호를 잊으셨나요?' })).toHaveAttribute(
      'href',
      PASSWORD_RESET_PATH,
    );
    await expect(canvas.getByRole('button', { name: '카카오로 시작하기' })).toBeDisabled();
  },
};

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
  args: { ...filledCredentials, defaultPasswordVisible: true, rememberEmail: true },
};

export const Submitting: Story = {
  args: { ...filledCredentials, isSubmitting: true },
};

export const Failed: Story = {
  args: { ...PasswordVisible.args, loginError: 'credentials' },
};
