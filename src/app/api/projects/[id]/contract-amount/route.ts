import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { commercialOffers, projects } from '@/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { assertProjectAccess } from '@/lib/db/projects'
import {
  canApproveBordereau,
  confirmContractAmount,
  getContractAmountProposal,
} from '@/lib/db/bordereau'
import { numOrNull } from '@/lib/bordereau-calc'
import { contractAmountSchema } from '@/lib/validation/bordereau'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * The project's contract amount, and the suggestion a won FOR-CO-02 makes.
 *
 * `approvedBudget` is returned beside it precisely so the two figures are never
 * confused: it is the internal COST ceiling that `project-spend.ts` measures
 * consumption against, and it is not written by anything in this route.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 },
    )

  const [project] = await db
    .select({
      contractAmount: projects.contractAmount,
      contractAmountSuggested: projects.contractAmountSuggested,
      contractAmountSourceOfferId: projects.contractAmountSourceOfferId,
      contractAmountConfirmedAt: projects.contractAmountConfirmedAt,
      approvedBudget: projects.approvedBudget,
      currency: projects.currency,
    })
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  // The most recently decided won-and-approved offer for this project. At most
  // one may be approved at a time, so this is unambiguous.
  const [won] = await db
    .select({ id: commercialOffers.id })
    .from(commercialOffers)
    .where(
      and(
        eq(commercialOffers.projectId, id),
        eq(commercialOffers.status, 'gagnee'),
        isNull(commercialOffers.deletedAt),
      ),
    )
    .orderBy(desc(commercialOffers.updatedAt))
    .limit(1)

  const proposal = won ? await getContractAmountProposal(won.id) : null

  return NextResponse.json({
    contractAmount: numOrNull(project.contractAmount),
    contractAmountSuggested: numOrNull(project.contractAmountSuggested),
    contractAmountSourceOfferId: project.contractAmountSourceOfferId,
    contractAmountConfirmedAt: project.contractAmountConfirmedAt,
    /** Read-only here, and deliberately: a selling price never writes it. */
    approvedBudget: numOrNull(project.approvedBudget),
    currency: project.currency,
    proposal,
  })
}

/**
 * Confirms the contract amount. Never automatic.
 *
 * Writes `contract_amount` only. `approved_budget` — the internal cost ceiling
 * every budget-consumption percentage and both alert thresholds are measured
 * against — and `actual_revenue` — realised, invoiced revenue — are left
 * untouched, which is the whole reason this column exists.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canApproveBordereau(session.user.role))
    return NextResponse.json(
      { error: "Seules la direction et l'administration peuvent fixer le montant contractuel" },
      { status: 403 },
    )

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 },
    )

  const parsed = contractAmountSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  // The offer must actually belong to this project: a confirmation is evidence
  // that a specific commercial document produced the figure.
  const [offer] = await db
    .select({ id: commercialOffers.id, projectId: commercialOffers.projectId })
    .from(commercialOffers)
    .where(and(eq(commercialOffers.id, parsed.data.offerId), isNull(commercialOffers.deletedAt)))
    .limit(1)
  if (!offer || offer.projectId !== id)
    return NextResponse.json(
      { error: "L'offre indiquée n'est pas rattachée à ce projet" },
      { status: 409 },
    )

  const result = await confirmContractAmount(id, parsed.data, session.user.userId, session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json({ success: true })
}
