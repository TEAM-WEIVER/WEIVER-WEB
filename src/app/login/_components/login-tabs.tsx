export type LoginTab = 'corporate' | 'individual';

const LOGIN_TABS = [
  { value: 'corporate', label: '기업 회원' },
  { value: 'individual', label: '개인 회원' },
] as const;

export function LoginTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: LoginTab;
  onTabChange: (tab: LoginTab) => void;
}) {
  return (
    <div className="bg-primary-100 flex w-full items-center gap-1.5 rounded-full p-1.5">
      {LOGIN_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={`text-h4 flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full transition-colors ${
            activeTab === tab.value ? 'bg-primary-700 text-text-inverse' : 'text-text-tertiary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
