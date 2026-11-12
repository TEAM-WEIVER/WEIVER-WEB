import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { GlobalHeader, HeaderNavItem } from './global-header';
import { HeaderProfileButton } from './header-profile-button';

const meta = {
  title: 'Common/GlobalHeader',
  component: GlobalHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GlobalHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const onProfileClick = fn();
const menus = ['홈', '지원 준비', 'AI면접', '역량 리포트'];

function HeaderExample({ givenName = '민수' }: { givenName?: string | null }) {
  const [selected, setSelected] = useState('지원 준비');

  return (
    <GlobalHeader
      navigation={menus.map((label) => (
        <HeaderNavItem key={label} active={selected === label} asChild>
          <button type="button" onClick={() => setSelected(label)}>
            {label}
          </button>
        </HeaderNavItem>
      ))}
      profile={<HeaderProfileButton givenName={givenName} onClick={onProfileClick} />}
    />
  );
}

export const Default: Story = {
  render: () => <HeaderExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '지원 준비' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'AI면접' }));
    await expect(canvas.getByRole('button', { name: 'AI면접' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('button', { name: '지원 준비' })).not.toHaveAttribute(
      'aria-current',
    );
    await userEvent.click(canvas.getByRole('button', { name: '민수 프로필' }));
    await expect(onProfileClick).toHaveBeenCalled();
  },
};

export const WithoutProfile: Story = {
  args: {
    navigation: <HeaderNavItem href="/home">홈</HeaderNavItem>,
  },
};

export const MissingName: Story = {
  render: () => <HeaderExample givenName={null} />,
};

export const SingleCharacterName: Story = {
  render: () => <HeaderExample givenName="준" />,
};

export const TwoCharacterLimit: Story = {
  render: () => <HeaderExample givenName="하늘빛" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: '하늘 프로필' })).toBeVisible();
  },
};

export const Narrow: Story = {
  render: () => (
    <div style={{ width: 360, maxWidth: '100%' }}>
      <HeaderExample />
    </div>
  ),
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
