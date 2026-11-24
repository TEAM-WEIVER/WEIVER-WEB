import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, mocked, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';
import type { ResumeDraft } from './_model/resume-sections';
import { advanceResumeSource, type ResumeSource } from './_model/resume-source';
import { PostingResumeEditor } from './posting-resume-editor';

const master: ResumeDraft = {
  education: [
    {
      entryId: 'school-1',
      level: '대학교 (4년제)',
      school: '위버대학교',
      major: '컴퓨터공학',
      grade: '4.1',
      gradeScale: '4.5',
      startMonth: '2020.03',
      endMonth: '2024.02',
      status: '졸업',
    },
  ],
  career: [],
  certifications: [],
  awards: [],
};
const postingDraft: ResumeDraft = {
  ...master,
  education: [{ ...master.education[0], school: '공고별 학교' }],
};

const meta = {
  title: 'Pages/Documents/PostingResume',
  component: PostingResumeEditor,
  parameters: { layout: 'fullscreen' },
  decorators: [withPreparationHeader],
  args: {
    masterResume: master,
    onSave: fn((draft: ResumeDraft, { source }: { source?: ResumeSource }) =>
      source ? advanceResumeSource(source, draft) : undefined,
    ),
  },
} satisfies Meta<typeof PostingResumeEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ExplicitImport: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole('heading', { name: /위버대학교/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '마스터본 불러오기' }));
    await expect(
      canvas.getByRole('heading', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('alertdialog')).not.toBeInTheDocument();
  },
};

export const ConfirmOverwrite: Story = {
  args: { initialDraft: postingDraft },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const load = canvas.getByRole('button', { name: '마스터본 불러오기' });
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 공고별 학교 · 컴퓨터공학 수정' }),
    );
    await userEvent.clear(canvas.getByRole('textbox', { name: '학교명' }));
    await userEvent.type(canvas.getByRole('textbox', { name: '학교명' }), '저장 전 편집');
    await userEvent.click(load);
    const body = within(canvasElement.ownerDocument.body);
    let dialog = within(await body.findByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: '취소' }));
    await expect(canvas.getByRole('textbox', { name: '학교명' })).toHaveValue('저장 전 편집');
    await expect(load).toHaveFocus();
    await userEvent.click(load);
    dialog = within(await body.findByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: '불러오기' }));
    await expect(
      canvas.getByRole('heading', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: '마스터본 불러오기' })).toHaveFocus();
  },
};

export const SaveImportedCopy: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '마스터본 불러오기' }));
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 위버대학교 · 컴퓨터공학 수정' }),
    );
    await userEvent.clear(canvas.getByRole('textbox', { name: '학교명' }));
    await userEvent.type(canvas.getByRole('textbox', { name: '학교명' }), '공고 A 학교');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSave).toHaveBeenCalledWith(
      { ...master, education: [{ ...master.education[0], school: '공고 A 학교' }] },
      { source: { baseline: master, masterEntryIds: ['school-1'] } },
    );
  },
};

export const SaveFailure: Story = {
  args: {
    initialDraft: postingDraft,
    onSave: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    mocked(args.onSave)
      .mockImplementationOnce(() => {
        throw new Error('local storage unavailable');
      })
      .mockReturnValue(undefined);
    await userEvent.click(
      canvas.getByRole('button', { name: '대학교 (4년제) · 공고별 학교 · 컴퓨터공학 수정' }),
    );
    await userEvent.clear(canvas.getByRole('textbox', { name: '학교명' }));
    await userEvent.type(canvas.getByRole('textbox', { name: '학교명' }), '실패 후 재시도');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('입력 내용은 유지되어 있어요.');
    await expect(canvas.getByRole('textbox', { name: '학교명' })).toHaveValue('실패 후 재시도');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSave).toHaveBeenCalledTimes(2);
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const MissingMaster: Story = {
  args: { initialDraft: postingDraft, masterResume: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '마스터본 불러오기' })).toBeDisabled();
    await expect(canvas.getByRole('heading', { name: /공고별 학교/ })).toBeVisible();
  },
};

export const NarrowOverwrite: Story = {
  args: { initialDraft: postingDraft },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '마스터본 불러오기' }));
    await expect(within(canvasElement.ownerDocument.body).getByRole('alertdialog')).toBeVisible();
  },
};
