import { prisma } from '@/lib/db'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tâches – SOPAT Admin' }

export default async function TasksPage() {
  const [tasksRaw, projects] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const tasks = JSON.parse(JSON.stringify(tasksRaw))
  return <TasksClient tasks={tasks} projects={projects} />
}
