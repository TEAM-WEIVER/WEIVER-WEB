'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, GripVertical, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const JOB_CATEGORIES = ['개발자', '디자인', '기획'] as const;

const DETAIL_JOBS: Record<(typeof JOB_CATEGORIES)[number], string[]> = {
  개발자: ['프론트엔드 개발자', '백엔드 개발자', 'AI 개발자', '보안', '데이터'],
  디자인: ['프로덕트 디자이너', '브랜드 디자이너', 'UX 리서처'],
  기획: ['서비스기획자', '프로덕트 매니저', '사업기획자'],
};

const COMPETENCIES = ['성장가능성', '일관성', '문제해결력', '논리성', '협업 및 팀워크', '대처능력'];

const TRAITS = [
  {
    title: '자율 · 혁신',
    description: '새로운 시도를 장려하고, 개인의 자율성과 창의적 문제 해결을 중요하게 생각',
  },
  {
    title: '성과 · 영향',
    description:
      '명확한 목표와 결과를 중시하며, 조직과 시장에 실질적인 영향을 만드는 것을 중요하게 생각하는 환경',
  },
  {
    title: '안정 · 질서',
    description:
      '정해진 프로세스와 체계를 기반으로, 예측 가능하고 안정적인 운영을 중요하게 여기는 환경',
  },
  {
    title: '관계 · 공동체',
    description: '팀워크와 소통을 바탕으로, 구성원 간 신뢰와 협력을 중요하게 생각하는 환경',
  },
];

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('bg-primary-700 w-1 shrink-0', description ? 'h-12' : 'h-7')} />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-h3 text-text-primary">{title}</h2>
        {description && <p className="text-caption text-text-tertiary">{description}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ label, caption }: { label: string; caption?: string }) {
  return (
    <div className="flex w-full items-end justify-between">
      <p className="text-h4 text-text-secondary">{label}</p>
      {caption && <p className="text-caption text-text-tertiary">{caption}</p>}
    </div>
  );
}

function FormCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'border-border-light bg-bg-primary flex w-full flex-col rounded-[20px] border p-6 lg:p-11',
        className,
      )}
    >
      {children}
    </section>
  );
}

function TextInputField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <FieldLabel label={label} />
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn('flex w-full flex-col gap-2', className)}>
      <FieldLabel label={label} caption="글자수 제한 없음" />
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-32 resize-none"
      />
    </label>
  );
}

function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-col gap-2">
      <FieldLabel label={label} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((next) => !next)}
        className={cn(
          'text-body2 border-border-default bg-bg-primary text-text-primary flex h-12 w-full items-center justify-between rounded-lg border px-5 py-3 text-left transition-colors',
          disabled && 'bg-bg-secondary text-text-disabled cursor-not-allowed',
        )}
      >
        <span className={cn(!value && 'text-text-disabled')}>{value || placeholder}</span>
        <ChevronDown className="text-primary-600 size-6 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="border-border-light bg-bg-primary absolute top-[82px] right-0 left-0 z-20 overflow-hidden rounded-lg border shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'text-body2 text-text-primary hover:bg-bg-tertiary flex h-10 w-full items-center justify-between px-5 text-left',
                  isSelected && 'bg-bg-tertiary',
                )}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
                {isSelected && <Check className="text-primary-600 size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillStackInput() {
  const [skills, setSkills] = useState(['React', 'React']);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const nextSkill = draft.trim();
    if (!nextSkill) return;
    setSkills((prev) => [...prev, nextSkill]);
    setDraft('');
    setIsEditing(false);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-body2 text-text-disabled">
        + 버튼을 누른 뒤, 기술 스택을 작성 후 Enter로 입력할 수 있습니다.
      </p>
      <div className="border-border-light bg-bg-secondary flex min-h-12 w-full flex-wrap items-center gap-2 rounded-lg border p-3">
        {skills.map((skill, index) => (
          <button
            key={`${skill}-${index}`}
            type="button"
            className="text-body2 border-border-default bg-primary-200 text-text-primary flex h-7 items-center gap-1.5 rounded-md border px-2"
            onClick={() =>
              setSkills((prev) => prev.filter((_, skillIndex) => skillIndex !== index))
            }
          >
            {skill}
            <X className="text-primary-500 size-3.5" />
          </button>
        ))}

        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSkill();
              }
              if (event.key === 'Escape') {
                setDraft('');
                setIsEditing(false);
              }
            }}
            onBlur={addSkill}
            className="text-body2 text-text-primary placeholder:text-text-disabled h-7 min-w-[120px] flex-1 bg-transparent outline-none"
            placeholder="기술 입력"
          />
        ) : (
          <button
            type="button"
            aria-label="기술 스택 추가"
            className="border-border-default bg-primary-200 text-text-disabled flex size-7 items-center justify-center rounded-md border"
            onClick={() => setIsEditing(true)}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function JobPostingForm() {
  const [jobCategory, setJobCategory] = useState('');
  const [detailedJob, setDetailedJob] = useState('');
  const [competencyPriorities, setCompetencyPriorities] = useState(['', '', '', '']);
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

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePriority = (index: number, value: string) => {
    setCompetencyPriorities((prev) =>
      prev.map((priority, priorityIndex) => (priorityIndex === index ? value : priority)),
    );
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
                  setJobCategory(value);
                  setDetailedJob('');
                }}
              />
              <SelectField
                label="세부 직무 선택"
                placeholder="세부 직무"
                value={detailedJob}
                options={detailedJobOptions}
                onChange={setDetailedJob}
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
            <SkillStackInput />
          </div>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-col gap-6">
          <SectionTitle
            title="지원자 성향 우선순위 나열"
            description="드래그 앤 드롭으로 우선순위를 나열해주세요."
          />

          <div className="flex flex-col gap-3.5">
            {TRAITS.map((trait, index) => (
              <div key={trait.title} className="flex items-center gap-3.5">
                <div className="border-border-default bg-bg-tertiary flex h-[68px] w-12 shrink-0 items-center justify-center rounded-lg border">
                  <p className="text-h4 text-text-disabled">{index + 1}</p>
                </div>
                <div className="border-border-light bg-bg-secondary flex min-h-[68px] min-w-0 flex-1 items-center rounded-lg border p-3.5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <GripVertical className="text-primary-600 size-[18px] shrink-0" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-body2 text-text-primary">{trait.title}</p>
                      <p className="text-caption text-text-tertiary truncate">
                        {trait.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

          <div className="flex justify-end gap-3.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="border-border-default bg-bg-primary h-[42px] rounded-[10px] shadow-none"
            >
              임시저장
            </Button>
            <Button type="button" size="xs" className="h-[42px] rounded-[10px]" disabled>
              저장
            </Button>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
