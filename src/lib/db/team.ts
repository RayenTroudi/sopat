import { db } from '../../../db/index'
import { users } from '../../../db/schema'
import { eq, and, isNull, asc, ilike, or } from 'drizzle-orm'
import { hash } from 'bcryptjs'
import type { UserRole } from '@/lib/auth-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TeamMemberRow = {
  id:        string
  name:      string
  email:     string
  role:      UserRole
  phone:     string | null
  isActive:  boolean
  createdAt: Date
  updatedAt: Date
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listUsers(opts?: { search?: string; role?: string }): Promise<TeamMemberRow[]> {
  const rows = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      role:      users.role,
      phone:     users.phone,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        opts?.search
          ? or(ilike(users.name, `%${opts.search}%`), ilike(users.email, `%${opts.search}%`))
          : undefined,
        opts?.role ? eq(users.role, opts.role as UserRole) : undefined,
      )
    )
    .orderBy(asc(users.name))

  return rows as TeamMemberRow[]
}

export async function getUserById(id: string): Promise<TeamMemberRow | null> {
  const [row] = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      role:      users.role,
      phone:     users.phone,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1)

  return (row as TeamMemberRow | undefined) ?? null
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUser(input: {
  name:      string
  email:     string
  password:  string
  role:      UserRole
  phone?:    string
  createdBy: string
}) {
  const passwordHash = await hash(input.password, 12)
  const [row] = await db
    .insert(users)
    .values({
      name:         input.name,
      email:        input.email.toLowerCase(),
      passwordHash,
      role:         input.role,
      phone:        input.phone ?? null,
      isActive:     true,
      createdBy:    input.createdBy,
    })
    .returning({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      role:      users.role,
      phone:     users.phone,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
  return row as TeamMemberRow
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUser(id: string, input: {
  name?:     string
  role?:     UserRole
  phone?:    string | null
  isActive?: boolean
  password?: string
}) {
  const extra: Record<string, unknown> = {}
  if (input.password) {
    extra.passwordHash = await hash(input.password, 12)
  }

  const [row] = await db
    .update(users)
    .set({
      ...(input.name     !== undefined ? { name:     input.name }     : {}),
      ...(input.role     !== undefined ? { role:     input.role }     : {}),
      ...(input.phone    !== undefined ? { phone:    input.phone }    : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...extra,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      role:      users.role,
      phone:     users.phone,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })

  return (row as TeamMemberRow | undefined) ?? null
}
