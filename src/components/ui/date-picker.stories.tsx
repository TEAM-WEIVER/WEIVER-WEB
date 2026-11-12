import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DatePicker } from './date-picker';
const meta = {
  title: 'UI/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    minYear: 2020,
    maxYear: 2030,
    value: '2026-11-12',
    'aria-label': '날짜 선택',
  },
  decorators: [
    (Story) => (
      <div className="min-h-96 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Date: Story = {
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value);
    return <DatePicker {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '날짜 선택' }));
    await userEvent.click(canvas.getByRole('button', { name: '15' }));
    await expect(canvas.getByRole('textbox', { name: '날짜 선택 값' })).toHaveValue('2026-11-15');
    await userEvent.click(canvas.getByRole('button', { name: '날짜 선택' }));
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('button', { name: '날짜 선택' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};
export const Month: Story = {
  args: { mode: 'month', value: '2026-11' },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value);
    return <DatePicker {...args} value={value} onChange={setValue} />;
  },
};
export const Empty: Story = { args: { value: null } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { 'aria-invalid': true } };
export const YearBoundary: Story = { args: { value: '2020-01-01', minYear: 2020, maxYear: 2020 } };
