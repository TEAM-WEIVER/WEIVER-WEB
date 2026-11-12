import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { expect, userEvent, within } from 'storybook/test';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: { 'aria-label': '입력값' },
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
      <Input aria-label="기본 상태" placeholder="기본 상태" />
      <Input aria-label="에러 상태" placeholder="에러 상태" aria-invalid={true} />
      <Input aria-label="비활성화 상태" placeholder="비활성화 상태" disabled />
    </div>
  ),
};

export const Outline: Story = { args: { variant: 'default', placeholder: '테두리 스타일' } };
export const ReadOnly: Story = { args: { readOnly: true, value: '저장된 값' } };
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox');
    await userEvent.type(input, '입력 예시');
    await expect(input).toHaveValue('입력 예시');
  },
};
