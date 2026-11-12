import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField, FieldError } from './form-field';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from './input';
const meta = {
  title: 'UI/FormField',
  component: FormField,
  subcomponents: { FieldError },
  tags: ['autodocs'],
  args: {
    label: '이메일',
    children: (field) => <Input {...field} placeholder="user@example.com" />,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('이메일'));
    await expect(canvas.getByRole('textbox', { name: '이메일' })).toHaveFocus();
  },
};
export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '이메일' });
    await expect(input).toHaveAccessibleDescription('이메일 형식을 확인해주세요.');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  },
  args: {
    error: '이메일 형식을 확인해주세요.',
    children: (field) => <Input {...field} defaultValue="invalid" />,
  },
};
export const StandaloneError: Story = {
  render: () => <FieldError>필수 입력 항목입니다.</FieldError>,
};
