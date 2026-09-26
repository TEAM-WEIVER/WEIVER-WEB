import { execFileSync, spawnSync } from 'node:child_process';

const baseRef = process.env.E2E_BASE_REF;

if (!baseRef) {
  throw new Error('E2E_BASE_REF must be set to the PR base branch ref.');
}

const changedFiles = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const testTargets = new Set();
let runFullSuite = false;

const add = (...targets) => targets.forEach((target) => testTargets.add(target));

for (const file of changedFiles) {
  if (file.startsWith('e2e/') && file.endsWith('.spec.ts')) {
    add(file);
    continue;
  }

  if (
    file.startsWith('e2e/') ||
    file === '.github/workflows/e2e.yml' ||
    file === 'scripts/run-affected-e2e.mjs'
  ) {
    runFullSuite = true;
    break;
  }

  if (
    file === 'package.json' ||
    file === 'pnpm-lock.yaml' ||
    file === 'playwright.config.ts' ||
    file.startsWith('src/app/api/') ||
    file.startsWith('src/app/layout') ||
    file.startsWith('src/app/globals') ||
    file.startsWith('src/components/common/') ||
    file.startsWith('src/components/ui/') ||
    file.startsWith('src/hooks/') ||
    file.startsWith('src/lib/') ||
    file.startsWith('src/store/') ||
    file.startsWith('src/schemas/')
  ) {
    runFullSuite = true;
    break;
  }

  if (file.startsWith('src/app/onboarding/')) {
    add('e2e/onboarding', 'e2e/cover-letter', 'e2e/79-global-route-loading.spec.ts');
  } else if (file.startsWith('src/app/signup/')) {
    add('e2e/signup');
  } else if (file.startsWith('src/app/applicant/dashboard/')) {
    add(
      'e2e/applicant/dashboard-skeleton.spec.ts',
      'e2e/applicant/dashboard-submission-status.spec.ts',
    );
  } else if (file.startsWith('src/app/applicant/interview/')) {
    add('e2e/applicant/interview.spec.ts', 'e2e/88-skeleton-spinner.spec.ts');
  } else if (file.startsWith('src/app/corporate/dashboard/')) {
    add('e2e/corporate/dashboard-skeleton.spec.ts', 'e2e/88-skeleton-spinner.spec.ts');
  } else if (file.startsWith('src/app/corporate/recruitment/')) {
    add('e2e/79-global-route-loading.spec.ts', 'e2e/88-skeleton-spinner.spec.ts');
  } else if (file.startsWith('src/app/')) {
    runFullSuite = true;
    break;
  }
}

if (runFullSuite) {
  console.log('Shared or unmapped application code changed; running the full E2E suite.');
  testTargets.clear();
}

if (!runFullSuite && testTargets.size === 0) {
  console.log('No E2E-relevant files changed; skipping affected E2E tests.');
  process.exit(0);
}

const args = ['exec', 'playwright', 'test', '--workers=2', ...testTargets];
console.log(`Running ${runFullSuite ? 'the full suite' : [...testTargets].join(', ')}.`);

const result = spawnSync('pnpm', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
