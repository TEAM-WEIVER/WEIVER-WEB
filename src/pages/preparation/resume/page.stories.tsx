import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { withPreparationHeader } from '../../../../.storybook/decorators/preparation-header';
import type { ResumeDraft } from './_model/resume-editor';
import ResumeEditor from './page';

const sampleCareer = {
  company: '위버',
  position: '서비스 기획자',
  employmentType: '정규직',
  employmentStatus: '퇴사',
  startMonth: '2023.03',
  endMonth: '2024.08',
  duties: '사용자 인터뷰를 진행하고 지원 준비 화면을 기획했습니다.',
};

const sampleDraft = {
  education: [
    {
      level: '대학교 (4년제)',
      school: '위버대학교',
      major: '컴퓨터공학과',
      grade: '4.1',
      gradeScale: '4.5',
      startMonth: '2019.03',
      endMonth: '2023.02',
      status: '졸업',
    },
  ],
  career: [
    sampleCareer,
    {
      ...sampleCareer,
      company: '스튜디오 모아',
      employmentType: '인턴',
      startMonth: '2022.03',
      endMonth: '2022.08',
    },
  ],
  certifications: [
    { name: 'TOEIC Speaking', issuer: 'ETS', issuedDate: '2024.05.20', score: 'Advanced Low' },
  ],
  awards: [
    {
      name: '캡스톤 디자인 우수상',
      organization: '위버대학교',
      awardedDate: '2022.11.30',
      description: '팀과 함께 취업 준비자를 위한 일정 관리 서비스를 제작했습니다.',
    },
  ],
} satisfies ResumeDraft;

const meta = {
  title: 'Pages/Preparation/Resume',
  component: ResumeEditor,
  parameters: { layout: 'fullscreen' },
  decorators: [withPreparationHeader],
  args: { progress: 0, onSaveDraft: fn() },
} satisfies Meta<typeof ResumeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('form', { name: '학력 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '경력사항 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '자격증 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('form', { name: '수상이력 정보 입력' })).toBeVisible();
    await expect(canvas.getByRole('progressbar', { name: '작성 진행률' })).toHaveAttribute(
      'value',
      '0',
    );
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      education: [],
      career: [],
      certifications: [],
      awards: [],
    });
  },
};

export const WithEntries: Story = {
  args: { progress: 100, initialDraft: sampleDraft },
};

export const AddEditAndDelete: Story = {
  args: { initialDraft: { ...sampleDraft, certifications: [] } },
  play: async ({ canvas, userEvent }) => {
    const section = within(canvas.getByRole('region', { name: '자격증' }));
    await userEvent.click(section.getByRole('button', { name: '자격증 추가' }));
    const form = within(section.getByRole('form', { name: '자격증 정보 입력' }));
    await userEvent.type(form.getByRole('textbox', { name: '자격증명' }), '정보처리기사');
    await userEvent.type(form.getByRole('textbox', { name: '취득일' }), '2025.06.20');
    await userEvent.click(form.getByRole('button', { name: '저장' }));
    await expect(section.getByRole('heading', { name: '정보처리기사' })).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 수정' }));
    const editForm = within(section.getByRole('form', { name: '자격증 정보 수정' }));
    await expect(editForm.getByRole('textbox', { name: '자격증명' })).toHaveValue('정보처리기사');
    await userEvent.type(editForm.getByRole('textbox', { name: '발행처' }), '한국산업인력공단');
    await userEvent.click(editForm.getByRole('button', { name: '저장' }));
    await expect(section.getByText('한국산업인력공단')).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 수정' }));
    const editAgain = within(section.getByRole('form', { name: '자격증 정보 수정' }));
    await userEvent.clear(editAgain.getByRole('textbox', { name: '발행처' }));
    await userEvent.click(editAgain.getByRole('button', { name: '취소' }));
    await expect(section.getByText('한국산업인력공단')).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '정보처리기사 삭제' }));
    await expect(section.queryByRole('heading', { name: '정보처리기사' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: '캡스톤 디자인 우수상' })).toBeVisible();
  },
};

export const EmploymentStatus: Story = {
  args: { progress: 40, initialDraft: sampleDraft },
  play: async ({ canvas, userEvent }) => {
    const section = within(canvas.getByRole('region', { name: '경력사항' }));
    await userEvent.click(section.getByRole('button', { name: '위버 수정' }));
    await userEvent.click(section.getByRole('button', { name: '스튜디오 모아 수정' }));

    const [firstForm, secondForm] = section.getAllByRole('form', { name: '경력사항 정보 수정' });
    const first = within(firstForm);
    const second = within(secondForm);
    const endMonth = first.getByRole('textbox', { name: '퇴사년월' });
    const otherEndMonth = second.getByRole('textbox', { name: '퇴사년월' });
    const status = first.getByRole('combobox', { name: '재직상태' });

    await expect(endMonth).toHaveValue('2024.08');
    await userEvent.selectOptions(status, '재직중');
    await expect(endMonth).toBeDisabled();
    await expect(endMonth).not.toBeRequired();
    await expect(endMonth).toHaveValue('');
    await expect(otherEndMonth).toBeEnabled();
    await expect(otherEndMonth).toHaveValue('2022.08');
    await userEvent.click(first.getByRole('textbox', { name: '입사년월' }));
    await userEvent.tab();
    await expect(first.getByRole('textbox', { name: '담당업무' })).toHaveFocus();

    await userEvent.selectOptions(status, '퇴사');
    await expect(endMonth).toBeEnabled();
    await expect(endMonth).toBeRequired();
    await userEvent.click(first.getByRole('button', { name: '저장' }));
    await expect(endMonth).toHaveFocus();
    await expect(endMonth).toHaveAttribute('aria-invalid', 'true');
    await expect(first.getByText('필수 입력 항목입니다.')).toBeVisible();

    await userEvent.selectOptions(status, '재직중');
    await expect(endMonth).toHaveAttribute('aria-invalid', 'false');
    await expect(first.queryByText('필수 입력 항목입니다.')).not.toBeInTheDocument();
    await userEvent.click(first.getByRole('button', { name: '저장' }));
    await expect(section.getByText('2023.03 ~ 재직중')).toBeVisible();

    await userEvent.click(section.getByRole('button', { name: '위버 수정' }));
    const [reopened] = section.getAllByRole('form', { name: '경력사항 정보 수정' });
    const reopenedForm = within(reopened);
    await userEvent.selectOptions(reopenedForm.getByRole('combobox', { name: '재직상태' }), '퇴사');
    await userEvent.type(reopenedForm.getByRole('textbox', { name: '퇴사년월' }), '2025.01');
    await userEvent.click(reopenedForm.getByRole('button', { name: '저장' }));
    await expect(section.getByText('2023.03 ~ 2025.01')).toBeVisible();
    await expect(otherEndMonth).toHaveValue('2022.08');
  },
};

export const SaveDraftWithEdits: Story = {
  args: {
    progress: 40,
    initialDraft: {
      ...sampleDraft,
      career: [{ ...sampleCareer, employmentStatus: '재직중' }, sampleDraft.career[1]],
    },
  },
  play: async ({ canvas, args, userEvent }) => {
    const career = within(canvas.getByRole('region', { name: '경력사항' }));
    await userEvent.click(career.getByRole('button', { name: '스튜디오 모아 수정' }));
    const careerForm = within(career.getByRole('form', { name: '경력사항 정보 수정' }));
    const company = careerForm.getByRole('textbox', { name: '회사명' });
    await userEvent.clear(company);
    await userEvent.type(company, '모아 스튜디오');

    await userEvent.click(canvas.getByRole('button', { name: '수상이력 추가' }));
    const award = within(canvas.getByRole('form', { name: '수상이력 정보 입력' }));
    await userEvent.type(award.getByRole('textbox', { name: '수상명' }), '서비스 기획 공모전');
    await userEvent.click(canvas.getByRole('button', { name: '임시 저장' }));

    await expect(args.onSaveDraft).toHaveBeenCalledOnce();
    await expect(args.onSaveDraft).toHaveBeenCalledWith({
      ...sampleDraft,
      career: [
        { ...sampleCareer, employmentStatus: '재직중', endMonth: '' },
        { ...sampleDraft.career[1], company: '모아 스튜디오' },
      ],
      awards: [
        ...sampleDraft.awards,
        { name: '서비스 기획 공모전', organization: '', awardedDate: '', description: '' },
      ],
    });
    await expect(award.getByRole('textbox', { name: '수여기관' })).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  },
};
