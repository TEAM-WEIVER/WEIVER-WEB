import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Label } from './label';
import { Input } from './input';
const meta = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  args: { children: '이름' },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LinkedInput: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Label htmlFor="label-demo-name">이름</Label>
      <Input id="label-demo-name" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('이름'));
    await expect(canvas.getByRole('textbox', { name: '이름' })).toHaveFocus();
  },
};
