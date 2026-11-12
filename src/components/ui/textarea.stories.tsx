import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Textarea } from './textarea';
const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: { 'aria-label': '면접 답변', placeholder: '답변을 입력하세요' },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox');
    await userEvent.type(input, '답변 예시');
    await expect(input).toHaveValue('답변 예시');
  },
};
export const Outline: Story = { args: { variant: 'default' } };
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: '잘못된 입력' } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: '저장된 답변' } };
