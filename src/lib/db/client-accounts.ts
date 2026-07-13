import { db } from '@/db'
import { clientAccountEntries, clients, projects } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export type ClientAccountEntry = typeof clientAccountEntries.$inferSelect

export type ClientEntryType = 'facture' | 'encaissement' | 'avoir'

export const ENTRY_TYPE_LABELS: Record<ClientEntryType, string> = {
  facture: 'Facture',
  encaissement: 'Encaissement',
  avoir: 'Avoir',
}

export async function getClientAccountEntries(filters?: { clientId?: string }) {
  return db
    .select({
      entry: clientAccountEntries,
      clientName: clients.companyName,
      projectName: projects.name,
    })
    .from(clientAccountEntries)
    .leftJoin(clients, eq(clientAccountEntries.clientId, clients.id))
    .leftJoin(projects, eq(clientAccountEntries.projectId, projects.id))
    .where(
      and(
        isNull(clientAccountEntries.deletedAt),
        filters?.clientId ? eq(clientAccountEntries.clientId, filters.clientId) : undefined,
      )
    )
    .orderBy(desc(clientAccountEntries.entryDate))
}

export type ClientBalance = {
  clientId: string
  clientName: string
  invoiced: number
  collected: number
  credited: number
  balance: number
}

/** Per-client balance: solde = facturé − avoirs − encaissé (FOR CO 03). */
export async function getClientBalances(): Promise<ClientBalance[]> {
  const rows = await db
    .select({
      clientId: clientAccountEntries.clientId,
      clientName: clients.companyName,
      entryType: clientAccountEntries.entryType,
      amount: clientAccountEntries.amount,
    })
    .from(clientAccountEntries)
    .leftJoin(clients, eq(clientAccountEntries.clientId, clients.id))
    .where(isNull(clientAccountEntries.deletedAt))

  const byClient = new Map<string, ClientBalance>()
  for (const r of rows) {
    const cur = byClient.get(r.clientId) ?? {
      clientId: r.clientId,
      clientName: r.clientName ?? '—',
      invoiced: 0,
      collected: 0,
      credited: 0,
      balance: 0,
    }
    const amt = Number(r.amount)
    if (r.entryType === 'facture') cur.invoiced += amt
    else if (r.entryType === 'encaissement') cur.collected += amt
    else cur.credited += amt
    byClient.set(r.clientId, cur)
  }
  const result = [...byClient.values()]
  for (const c of result) c.balance = c.invoiced - c.credited - c.collected
  return result.sort((a, b) => b.balance - a.balance)
}

export async function getClientsForSelect() {
  return db
    .select({ id: clients.id, name: clients.companyName })
    .from(clients)
    .orderBy(clients.companyName)
}
