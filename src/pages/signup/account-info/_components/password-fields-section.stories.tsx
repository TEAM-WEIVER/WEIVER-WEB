import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { expect, userEvent, within } from 'storybook/test';
import type { IndividualAccountData } from '@/schemas/signup';
import { PasswordFieldsSection } from './password-fields-section';
const meta = {
  title: 'Auth/PasswordFieldsSection',
  component: PasswordFieldsSection,
  tags: ['autodocs'],
  render: function Controlled(args) {
    const form = useForm<IndividualAccountData>({
      defaultValues: { password: '', passwordConfirm: '' },
    });
    return (
      <div className="w-full max-w-md">
        <PasswordFieldsSection
          {...args}
          register={form.register}
          password={form.watch('password')}
          errors={args.errors ?? {}}
        />
      </div>
    );
  },
} satisfies Meta<typeof PasswordFieldsSection>;
export default meta;
type Story = StoryObj<typeof PasswordFieldsSection>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByPlaceholderText('영문/숫자/특수문자 포함 8~64자'),
      'Demo1234!',
    );
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 보기' }));
    await expect(canvas.getByPlaceholderText('영문/숫자/특수문자 포함 8~64자')).toHaveAttribute(
      'type',
      'text',
    );
  },
};
export const Mismatch: Story = {
  args: {
    errors: { passwordConfirm: { type: 'validate', message: '비밀번호가 일치하지 않습니다.' } },
  },
};
