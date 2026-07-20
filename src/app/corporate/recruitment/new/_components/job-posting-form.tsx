'use client';

import { useMemo, useState } from 'react';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useCreateJobPosting } from '@/hooks/corporate/use-job-posting';
import type { JobPostingRequest } from '@/schemas/corporate/job-posting';

import { COMPETENCIES, DETAIL_JOBS, JOB_CATEGORIES, TRAITS } from './job-posting-form.constants';
import type { TraitPriority } from './job-posting-form.constants';
import {
  FormCard,
  SectionTitle,
  SelectField,
  TextareaField,
  TextInputField,
} from './job-posting-form-fields';
import {
  isValidDateInput,
  normalizeDate,
  normalizeTraitTitle,
  toRequestFormData,
} from './job-posting-form.utils';
import { SkillStackInput } from './skill-stack-input';
import { TraitPrioritySortableList } from './trait-priority-sortable-list';

export function JobPostingForm() {
  const router = useRouter();
  const createJobPosting = useCreateJobPosting();
  const [jobCategory, setJobCategory] = useState('');
  const [detailedJob, setDetailedJob] = useState('');
  const [competencyPriorities, setCompetencyPriorities] = useState(['', '', '', '']);
  const [requiredTechs, setRequiredTechs] = useState<string[]>([]);
  const [traitPriorities, setTraitPriorities] = useState<TraitPriority[]>(() => [...TRAITS]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    jobDescription: '',
    qualifications: '',
    requirements: '',
    preferredQualifications: '',
    emailTitle: '',
    emailContent: '',
  });

  const detailedJobOptions = useMemo(() => {
    if (!jobCategory) return [];
    return DETAIL_JOBS[jobCategory as keyof typeof DETAIL_JOBS] ?? [];
  }, [jobCategory]);

  const requiredFieldsFilled = Boolean(
    form.title.trim() &&
    form.deadline.trim() &&
    isValidDateInput(form.deadline) &&
    jobCategory &&
    detailedJob &&
    form.emailTitle.trim() &&
    form.emailContent.trim(),
  );

  const isSubmitting = createJobPosting.isPending;

  const traitPriorityIds = useMemo(
    () => traitPriorities.map((trait) => trait.title),
    [traitPriorities],
  );

  const updateForm = (key: keyof typeof form, value: string) => {
    if (submitMessage) setSubmitMessage(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePriority = (index: number, value: string) => {
    setCompetencyPriorities((prev) =>
      prev.map((priority, priorityIndex) => (priorityIndex === index ? value : priority)),
    );
  };

  const buildRequestDTO = (): JobPostingRequest => ({
    title: form.title.trim(),
    deadline: normalizeDate(form.deadline),
    jobCategory,
    detailedJob,
    jobDescription: form.jobDescription.trim(),
    qualifications: form.qualifications.trim(),
    requirements: form.requirements.trim(),
    preferredQualifications: form.preferredQualifications.trim(),
    competencyPriorities: competencyPriorities.map((priority) => priority.trim()).filter(Boolean),
    requiredTechs: requiredTechs.map((tech) => tech.trim()).filter(Boolean),
    traitPriorities: traitPriorities.map((trait) => normalizeTraitTitle(trait.title)),
    emailTitle: form.emailTitle.trim(),
    emailContent: form.emailContent.trim(),
  });

  const handleTraitDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setTraitPriorities((items) => {
      const oldIndex = items.findIndex((trait) => trait.title === active.id);
      const newIndex = items.findIndex((trait) => trait.title === over.id);

      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSubmit = async (isTemp: boolean) => {
    if (!requiredFieldsFilled || isSubmitting) {
      setSubmitMessage('필수 항목을 모두 입력해 주세요.');
      return;
    }

    setSubmitMessage(null);

    try {
      await createJobPosting.mutate(toRequestFormData(buildRequestDTO()), isTemp);
      router.push('/corporate/dashboard');
    } catch {
      setSubmitMessage('공고 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1062px] flex-col gap-6">
      <FormCard>
        <div className="flex flex-col gap-[34px]">
          <div className="flex flex-col gap-2">
            <h1 className="text-h2 text-text-secondary">공고를 작성해주세요.</h1>
            <p className="text-body2 text-text-tertiary">
              기본 공고 및 원하는 지원자의 역량, 성향을 입력해주세요.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <SectionTitle title="기본 공고 정보" />

            <div className="grid gap-3.5 min-[960px]:grid-cols-[1fr_388px]">
              <TextInputField
                label="공고 제목"
                placeholder="타이틀이 될 공고 제목을 입력해주세요."
                value={form.title}
                onChange={(value) => updateForm('title', value)}
              />
              <TextInputField
                label="공고 마감일"
                placeholder="YYYY.MM.DD"
                value={form.deadline}
                onChange={(value) => updateForm('deadline', value)}
              />
            </div>

            <div className="grid gap-3.5 min-[960px]:grid-cols-2">
              <SelectField
                label="직무 선택"
                placeholder="직무"
                value={jobCategory}
                options={JOB_CATEGORIES}
                onChange={(value) => {
                  if (submitMessage) setSubmitMessage(null);
                  setJobCategory(value);
                  setDetailedJob('');
                }}
              />
              <SelectField
                label="세부 직무 선택"
                placeholder="세부 직무"
                value={detailedJob}
                options={detailedJobOptions}
                onChange={(value) => {
                  if (submitMessage) setSubmitMessage(null);
                  setDetailedJob(value);
                }}
                disabled={!jobCategory}
              />
            </div>

            <TextareaField
              label="업무 소개"
              placeholder="업무에 대해 소개해주세요."
              value={form.jobDescription}
              onChange={(value) => updateForm('jobDescription', value)}
            />
            <TextareaField
              label="지원 자격"
              placeholder="지원 자격에 대해서 작성해주세요."
              value={form.qualifications}
              onChange={(value) => updateForm('qualifications', value)}
            />
            <TextareaField
              label="필수사항"
              placeholder="필수사항을 작성해주세요."
              value={form.requirements}
              onChange={(value) => updateForm('requirements', value)}
            />
            <TextareaField
              label="우대사항"
              placeholder="우대사항을 작성해주세요."
              value={form.preferredQualifications}
              onChange={(value) => updateForm('preferredQualifications', value)}
            />
          </div>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-[34px]">
          <div className="flex flex-col gap-6">
            <SectionTitle title="역량 평가 우선순위 선택" />
            <div className="grid gap-3.5 min-[960px]:grid-cols-2">
              {competencyPriorities.map((priority, index) => (
                <SelectField
                  key={index}
                  label={`${index + 1}순위`}
                  placeholder="역량 선택"
                  value={priority}
                  options={COMPETENCIES}
                  onChange={(value) => updatePriority(index, value)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <SectionTitle title="요구 기술 스택" />
            <SkillStackInput skills={requiredTechs} onChange={setRequiredTechs} />
          </div>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-6">
          <SectionTitle
            title="지원자 성향 우선순위 나열"
            description="드래그 앤 드롭으로 우선순위를 나열해주세요."
          />

          <TraitPrioritySortableList
            traits={traitPriorities}
            traitIds={traitPriorityIds}
            onDragEnd={handleTraitDragEnd}
          />
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-[34px]">
          <div className="flex flex-col gap-6">
            <SectionTitle
              title="메일 템플릿 작성"
              description="지원자 컨택 시, 전송할 메일 템플릿을 작성해주세요."
            />
            <TextInputField
              label="메일 제목"
              placeholder="메일 제목을 작성해주세요."
              value={form.emailTitle}
              onChange={(value) => updateForm('emailTitle', value)}
            />
            <TextareaField
              label="메일 내용"
              placeholder="메일 내용을 작성해주세요."
              value={form.emailContent}
              onChange={(value) => updateForm('emailContent', value)}
            />
          </div>

          <div className="flex flex-col items-end gap-3.5">
            {submitMessage && (
              <p className="text-body2 text-error" role="alert">
                {submitMessage}
              </p>
            )}
            <div className="flex justify-end gap-3.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={isSubmitting}
                onClick={() => void handleSubmit(true)}
                className="border-border-default bg-bg-primary h-[42px] rounded-[10px] shadow-none"
              >
                {isSubmitting ? '저장 중...' : '임시저장'}
              </Button>
              <Button
                type="button"
                size="xs"
                className="h-[42px] rounded-[10px]"
                disabled={isSubmitting || !requiredFieldsFilled}
                onClick={() => void handleSubmit(false)}
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
