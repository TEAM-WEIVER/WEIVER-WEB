import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import {
  calculateDocumentProgress,
  calculateOverallDocumentProgress,
} from '@/lib/document-progress';

import { DocumentEditorLayout } from './DocumentEditorLayout';

const meta = {
  title: 'Common/DocumentEditorLayout',
  component: DocumentEditorLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    activeDocument: 'resume',
    progress: 40,
    onSaveDraft: fn(),
    onDocumentChange: fn(),
    children: <h1 className="text-h3">학력</h1>,
  },
} satisfies Meta<typeof DocumentEditorLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('이력서').closest('[aria-current]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '40',
    );
    await userEvent.click(canvas.getByRole('button', { name: /자기소개서/ }));
    await expect(args.onDocumentChange).toHaveBeenCalledWith('cover-letter');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledOnce();
    await expect(args.onSaveDraft).toHaveBeenCalledWith();
  },
};

export const NotStarted: Story = {
  args: { progress: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('이력서').closest('[aria-current]')).toHaveTextContent('미작성');
  },
};

const resume = calculateDocumentProgress(true, [
  { id: 'education', isComplete: (saved) => saved },
  { id: 'career', isComplete: () => false },
  { id: 'awards', isComplete: () => false },
  { id: 'certifications', isComplete: () => false },
]);
const coverLetter = calculateDocumentProgress(true, [
  { id: 'question', isComplete: (saved) => saved },
]);
const portfolio = calculateDocumentProgress(false, [
  { id: 'portfolio', isComplete: (saved) => saved },
]);

export const OverallProgress: Story = {
  name: '세 서류 전체 진행률',
  args: {
    progress: calculateOverallDocumentProgress([resume, coverLetter, portfolio]).percentage,
    statuses: {
      resume: resume.status,
      'cover-letter': coverLetter.status,
      portfolio: portfolio.status,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('value', '33');
    await expect(canvas.getByText('이력서').closest('[aria-current]')).toHaveTextContent('작성 중');
    await expect(canvas.getByRole('button', { name: /자기소개서/ })).toHaveTextContent('작성 완료');
    await expect(canvas.getByRole('button', { name: /포트폴리오/ })).toHaveTextContent('미작성');
  },
};

export const MasterResume: Story = {
  args: { visibleDocuments: ['resume'] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('이력서')).toBeVisible();
    await expect(canvas.queryByText('자기소개서')).not.toBeInTheDocument();
    await expect(canvas.queryByText('포트폴리오')).not.toBeInTheDocument();
  },
};
