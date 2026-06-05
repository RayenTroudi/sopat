import { NewProjectForm } from './NewProjectForm'

export const metadata = { title: 'Nouveau projet — SOPAT Admin' }

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
          Nouveau projet
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Créer un projet — il sera ouvert directement en phase Études.
        </p>
      </div>
      <NewProjectForm />
    </div>
  )
}
