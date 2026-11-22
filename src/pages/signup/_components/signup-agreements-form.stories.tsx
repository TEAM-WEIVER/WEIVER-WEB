import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { SignupAgreementsForm } from './signup-agreements-form';

const meta = {
  title: 'Auth/SignupAgreementsForm',
  component: SignupAgreementsForm,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    description: '카카오 가입을 완료하려면 필수 약관에 동의해주세요.',
    backLabel: '로그인으로 돌아가기',
    onBack: fn(),
    onComplete: fn(async () => {}),
  },
} satisfies Meta<typeof SignupAgreementsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RequiredOnly: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const submit = canvas.getByRole('button', { name: '회원가입 완료' });
    await expect(submit).toBeDisabled();
    const checkboxes = canvas.getAllByRole('checkbox');
    for (const checkbox of checkboxes.slice(1, 6)) await userEvent.click(checkbox);
    await expect(submit).toBeEnabled();
    await expect(canvas.getByRole('checkbox', { name: /마케팅 정보 수신동의/ })).not.toBeChecked();
    await userEvent.click(submit);
    await expect(args.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: false }),
      expect.anything(),
    );
  },
};

export const EmailSignup: Story = {
  args: {
    description: '2단계 · 정보 수집 및 이용에 대한 약관에 동의해주세요.',
    backLabel: '이전 단계',
  },
};
