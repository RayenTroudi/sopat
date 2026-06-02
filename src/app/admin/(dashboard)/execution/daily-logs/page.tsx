import { redirect } from 'next/navigation'

export default function DailyLogsPage() {
  redirect('/admin/execution/site-reports?type=daily')
}
