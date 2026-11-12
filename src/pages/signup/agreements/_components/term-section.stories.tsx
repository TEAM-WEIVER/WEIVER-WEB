import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TermSection } from './term-section';
const item = {
  key: 'serviceTerms' as const,
  title: '약관 표시 예시',
  required: true,
  content: 'Storybook 표시용 예시입니다. 실제 서비스 약관이 아닙니다.',
  agreeLabel: '예시 약관에 동의합니다.',
};
const meta = {
  title: 'Auth/TermSection',
  component: TermSection,
  tags: ['autodocs'],
  args: { item, checked: false, onToggle: fn() },
  render: function Controlled(args) {
    const [checked, setChecked] = useState(args.checked);
    return (
      <TermSection {...args} checked={checked} onToggle={() => setChecked((value) => !value)} />
    );
  },
} satisfies Meta<typeof TermSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Required: Story = {
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox');
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
  },
};
export const Optional: Story = { args: { item: { ...item, required: false } } };
export const LongContent: Story = {
  args: {
    item: {
      ...item,
      content: Array.from(
        { length: 20 },
        (_, i) => `예시 조항 ${i + 1}: 표시 및 스크롤 확인용입니다.`,
      ).join('\n\n'),
    },
  },
};
