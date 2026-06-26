'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/projects')
    } else {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <DeleteButton variant="outline" onClick={() => setOpen(true)} />
      <DeleteModal
        open={open}
        title="Supprimer le projet ?"
        description={<><strong>{projectName}</strong> sera archivé. Toutes les données (budget, bons de commande, NC, photos) resteront dans la base de données.</>}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
