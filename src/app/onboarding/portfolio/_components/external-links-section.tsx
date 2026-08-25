import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { FieldError, formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PortfolioData } from '@/schemas/onboarding';

import { GithubIcon, NotionIcon } from './portfolio-icons';
import { SectionTitle } from './section-title';

interface ExternalLinksSectionProps {
  errors: FieldErrors<PortfolioData>;
  register: UseFormRegister<PortfolioData>;
  showErrors: boolean;
}

export function ExternalLinksSection({ errors, register, showErrors }: ExternalLinksSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="포트폴리오 링크 (선택)" />

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio-github-url" className="flex items-center gap-1.5">
            <GithubIcon />
            <span className="text-body1 text-text-secondary">Github</span>
          </Label>
          <Input
            {...register('githubUrl')}
            id="portfolio-github-url"
            placeholder="https://github.com/username"
            aria-invalid={showErrors && !!errors.githubUrl}
            className={`${formControlClass} ${
              showErrors && errors.githubUrl
                ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                : ''
            }`}
          />
          {showErrors ? <FieldError>{errors.githubUrl?.message}</FieldError> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio-notion-url" className="flex items-center gap-1.5">
            <NotionIcon />
            <span className="text-body1 text-text-secondary">Notion</span>
          </Label>
          <Input
            {...register('notionUrl')}
            id="portfolio-notion-url"
            placeholder="https://notion.so/..."
            aria-invalid={showErrors && !!errors.notionUrl}
            className={`${formControlClass} ${
              showErrors && errors.notionUrl
                ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                : ''
            }`}
          />
          {showErrors ? <FieldError>{errors.notionUrl?.message}</FieldError> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio-other-url" className="text-body1 text-text-secondary">
            기타 개인 사이트
          </Label>
          <Input
            {...register('otherUrl')}
            id="portfolio-other-url"
            placeholder="https://..."
            aria-invalid={showErrors && !!errors.otherUrl}
            className={`${formControlClass} ${
              showErrors && errors.otherUrl
                ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                : ''
            }`}
          />
          {showErrors ? <FieldError>{errors.otherUrl?.message}</FieldError> : null}
        </div>
      </div>
    </div>
  );
}
