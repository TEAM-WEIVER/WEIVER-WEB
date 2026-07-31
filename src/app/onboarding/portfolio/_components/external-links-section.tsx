import type { UseFormRegister } from 'react-hook-form';

import { formControlClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PortfolioData } from '@/schemas/onboarding';

import { GithubIcon, NotionIcon } from './portfolio-icons';
import { SectionTitle } from './section-title';

export function ExternalLinksSection({ register }: { register: UseFormRegister<PortfolioData> }) {
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
            className={formControlClass}
          />
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
            className={formControlClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio-other-url" className="text-body1 text-text-secondary">
            기타 개인 사이트
          </Label>
          <Input
            {...register('otherUrl')}
            id="portfolio-other-url"
            placeholder="https://..."
            className={formControlClass}
          />
        </div>
      </div>
    </div>
  );
}
