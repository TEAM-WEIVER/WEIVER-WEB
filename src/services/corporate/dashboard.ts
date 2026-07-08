import { apiRequest } from '@/lib/api-client';
import type { CompanyDashboard, JobPostingsSummary, JobPostingStatus, Notification } from '@/schemas/corporate/dashboard';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
}

export function getCompanyDashboard() {
  return apiRequest<ApiResponse<CompanyDashboard>>('/api/dashboards/company');
}

export function getDashboardJobPostings(params?: {
  status?: JobPostingStatus;
  page?: number;
  size?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.size !== undefined) query.set('size', String(params.size));
  const qs = query.toString();
  return apiRequest<ApiResponse<JobPostingsSummary>>(
    `/api/dashboards/job-postings${qs ? `?${qs}` : ''}`,
  );
}

export function getNotifications() {
  return apiRequest<ApiResponse<Record<string, Notification[]>>>('/api/dashboards/notifications');
}

export function readNotification(notificationId: number) {
  return apiRequest<ApiResponse<void>>(
    `/api/dashboards/notifications/${notificationId}/read`,
    { method: 'PATCH' },
  );
}

export function readAllNotifications() {
  return apiRequest<ApiResponse<void>>('/api/dashboards/notifications/read-all', {
    method: 'PATCH',
  });
}
