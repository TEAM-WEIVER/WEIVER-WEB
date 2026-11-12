import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LoginForm } from './login-form';
const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  args: {
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
      <div className="w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
  render: function Controlled(args) {
    const [email, setEmail] = useState(args.email);
    const [password, setPassword] = useState(args.password);
    const [showPassword, setShowPassword] = useState(args.showPassword);
    return (
      <LoginForm
        {...args}
        email={email}
        password={password}
        showPassword={showPassword}
        setEmail={setEmail}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        isFormValid={!!email && !!password}
      />
    );
  },
} satisfies Meta<typeof LoginForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Submitting: Story = {
  args: { isSubmitting: true, email: 'demo@example.com', password: 'storybook-demo' },
};
export const Failed: Story = {
  args: { loginError: '로그인에 실패했습니다. 입력 내용을 확인해주세요.' },
};
