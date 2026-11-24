import { Link } from 'react-router';

import { INDIVIDUAL_TERMS } from '@/lib/signup-terms';

export function PolicyPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const terms = INDIVIDUAL_TERMS.filter(({ key }) =>
    kind === 'privacy'
      ? key === 'privacyPolicy'
      : key === 'serviceTerms' || key === 'individualTerms',
  );
  return (
    <>
      <Link to="/home" className="text-body2 text-text-tertiary underline underline-offset-4">
        홈으로 돌아가기
      </Link>
      <h1 className="text-h2 mt-6 mb-8">{kind === 'privacy' ? '개인정보처리방침' : '이용약관'}</h1>
      <div className="space-y-6">
        {terms.map(({ key, title, content }) => (
          <section key={key} className="border-border-light rounded-xl border bg-white p-6">
            <h2 className="text-h3 mb-5">{title}</h2>
            <p className="text-body1 text-text-secondary whitespace-pre-line">{content}</p>
          </section>
        ))}
      </div>
    </>
  );
}
