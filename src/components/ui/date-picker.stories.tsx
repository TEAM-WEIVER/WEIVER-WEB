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
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('button', { name: '2026년 11월 15일' }),
    );
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

export const KeyboardNavigation: Story = {
  ...Date,
  args: { value: '2024-02-28' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: '날짜 선택' });
    await userEvent.click(trigger);
    await expect(body.getByRole('button', { name: '2024년 2월 28일' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(body.getByRole('button', { name: '2024년 2월 29일' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(body.getByRole('button', { name: '2024년 3월 1일' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('textbox', { name: '날짜 선택 값' })).toHaveValue('2024-03-01');
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveFocus();
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
export const KeyboardMonth: Story = {
  ...Month,
  args: { mode: 'month', value: '2026-12' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: '날짜 선택' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect(body.getByRole('button', { name: '2027년 1월' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('textbox', { name: '날짜 선택 값' })).toHaveValue('2027-01');
  },
};
export const LowerBoundary: Story = {
  ...Date,
  args: { value: '2020-01-01', minYear: 2020, maxYear: 2020 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: '날짜 선택' }));
    await userEvent.keyboard('{ArrowLeft}');
    await expect(body.getByRole('button', { name: '2020년 1월 1일' })).toHaveFocus();
    await expect(body.getByRole('button', { name: '이전 달' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
  },
};

export const OpenCalendar: Story = {
  ...Date,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '날짜 선택' }));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('dialog', { name: '날짜 선택 달력' }),
    ).toBeVisible();
  },
};

export const OpenMonth: Story = { ...Month, play: OpenCalendar.play };

export const PageNavigation: Story = {
  ...Date,
  args: { value: '2026-01-31' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: '날짜 선택' }));
    await userEvent.keyboard('{PageDown}');
    await expect(body.getByRole('button', { name: '2026년 2월 28일' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{PageUp}{/Shift}');
    await expect(body.getByRole('button', { name: '2025년 2월 28일' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(body.getByRole('button', { name: '2025년 3월 1일' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(body.getByRole('button', { name: '2025년 2월 23일' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
  },
};
