'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type SkillStackInputProps = {
  skills: string[];
  onChange: (skills: string[]) => void;
};

export function SkillStackInput({ skills, onChange }: SkillStackInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const nextSkill = draft.trim();
    if (!nextSkill) return;
    onChange([...skills, nextSkill]);
    setDraft('');
    setIsEditing(false);
  };

  const removeSkill = (targetIndex: number) => {
    onChange(skills.filter((_, skillIndex) => skillIndex !== targetIndex));
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
            onClick={() => removeSkill(index)}
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
