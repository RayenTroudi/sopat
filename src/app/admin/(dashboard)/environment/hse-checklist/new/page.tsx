import { getHseItems } from '@/lib/db/hse'
import { HseSubmissionForm } from './HseSubmissionForm'

export default async function NewHseSubmissionPage() {
  const items = await getHseItems()
  return <HseSubmissionForm items={items} />
}
