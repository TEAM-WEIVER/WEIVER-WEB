import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'search', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
    'aria-invalid': {
      control: 'boolean',
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: '플레이스홀더 텍스트',
  },
};

export const Invalid: Story = {
  args: {
    type: 'text',
    placeholder: '잘못된 입력',
    'aria-invalid': true,
  },
};

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: '비활성화 상태',
    disabled: true,
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Input placeholder="기본 상태" />
      <Input placeholder="에러 상태" aria-invalid={true} />
      <Input placeholder="비활성화 상태" disabled />
    </div>
  ),
};
