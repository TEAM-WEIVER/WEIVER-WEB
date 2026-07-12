import { ChevronRight, UsersRound } from 'lucide-react';

import type { Notification } from '@/schemas/corporate/dashboard';

type MatchingNotificationCardProps = {
  notifications: Notification[];
};

export function MatchingNotificationCard({ notifications }: MatchingNotificationCardProps) {
  return (
    <section className="border-border-light bg-bg-primary flex min-h-[286px] flex-col rounded-[20px] border p-6 lg:p-[34px]">
      <div className="border-border-light flex h-[70px] flex-col gap-0.5 border-b">
        <h2 className="text-h3 text-text-secondary">새로운 매칭 알림</h2>
        <p className="text-caption text-text-tertiary">클릭 시, 해당 공고 페이지로 이동합니다.</p>
      </div>

      <div className="flex flex-col">
        {notifications.map((notification) => (
          <button
            key={notification.notificationId}
            type="button"
            className="border-border-light hover:bg-bg-secondary flex h-[66px] items-center justify-between border-b px-3.5 text-left transition-colors"
          >
            <span className="flex min-w-0 items-center gap-3.5">
              <span className="bg-primary-200 text-primary-600 relative flex h-[38px] w-[39px] shrink-0 items-center justify-center rounded-md">
                <UsersRound size={20} className="fill-current" />
                {!notification.isRead && (
                  <span className="bg-error absolute -top-0.5 -right-0.5 size-1.5 rounded-full" />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body2 text-text-primary truncate">
                  {notification.message ?? '새로운 매칭이 있습니다.'}
                </span>
                <span className="text-caption text-text-disabled">{notification.createdAt}</span>
              </span>
            </span>
            <ChevronRight className="text-primary-300 size-6 shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}
