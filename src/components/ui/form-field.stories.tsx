import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField, FieldError } from './form-field';
import { Input } from './input';
const meta = {
  title: 'UI/FormField',
  component: FormField,
  subcomponents: { FieldError },
  tags: ['autodocs'],
  args: { label: '이메일', children: <Input aria-label="이메일" placeholder="user@example.com" /> },
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
export const Default: Story = {};
export const Invalid: Story = {
  args: {
    error: '이메일 형식을 확인해주세요.',
    children: <Input aria-label="이메일" aria-invalid defaultValue="invalid" />,
  },
};
export const StandaloneError: Story = {
  render: () => <FieldError>필수 입력 항목입니다.</FieldError>,
};
