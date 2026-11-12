import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './header';
const meta = {
  title: 'Common/LegacyHeader',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '로그인·회원가입에 남아 있는 빈 헤더입니다. 회원용 GlobalHeader와 별도로 유지 중입니다.',
      },
    },
  },
} satisfies Meta<typeof Header>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
