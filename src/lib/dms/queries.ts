// src/lib/dms/queries.ts
import { db } from '../../../db/index'
import {
  dmsDocuments,
  users,
  cloudinaryAssets,
  dmsCategoryEnum,
  dmsDepartmentEnum,
  dmsLifecycleStatusEnum,
  dmsConfidentialityEnum,
} from '../../../db/schema'
import { eq, and, isNull, asc, sql, ilike, or, aliasedTable } from 'drizzle-orm'
import type { TypeCode, ProcessCode } from './codes'

export type DmsDocRow = {
  id: string
  documentNumber: string
  title: string
  category: string
  department: string
  status: string
  confidentiality: string
  isoClauses: string[]
  tags: string[]
  effectiveDate: Date | null
  nextReviewDate: Date | null
  ownerId: string
  ownerName: string | null
  authorId: string
  authorName: string | null
  currentVersionId: string | null
  assetUrl: string | null
  legacyReference: string | null
  rowHighlight: 'none' | 'green' | 'red'
  versionLabel: string | null
  storageType: string | null
  managedByPassword: boolean
  observations: string | null
  createdAt: Date
  updatedAt: Date
}

export type DmsListFilters = {
  status?:      string
  category?:    string
  department?:  string
  typeCode?:    TypeCode
  processCode?: ProcessCode
  search?:      string
  page?:        number
  pageSize?:    number
}

export type DmsCreateInput = {
  documentNumber:     string
  title:              string
  category:           typeof dmsCategoryEnum.enumValues[number]
  department:         typeof dmsDepartmentEnum.enumValues[number]
  isoClauses?:        string[]
  confidentiality?:   typeof dmsConfidentialityEnum.enumValues[number]
  tags?:              string[]
  ownerId:            string
  authorId:           string
  effectiveDate?:     Date
  nextReviewDate?:    Date
  versionLabel?:      string
  storageType?:       string
  managedByPassword?: boolean
  observations?:      string
  legacyReference?:   string
  createdBy:          string
}

async function _listDmsDocuments(
  filters?: DmsListFilters,
): Promise<{ rows: DmsDocRow[]; total: number }> {
  const page     = filters?.page     ?? 1
  const pageSize = filters?.pageSize ?? 500
  const offset   = (page - 1) * pageSize

  const ownerUsers  = aliasedTable(users, 'owner_u')
  const authorUsers = aliasedTable(users, 'author_u')

  const conditions = [
    isNull(dmsDocuments.deletedAt),
    filters?.status     ? eq(dmsDocuments.status,     filters.status as typeof dmsLifecycleStatusEnum.enumValues[number])  : undefined,
    filters?.category   ? eq(dmsDocuments.category,   filters.category as typeof dmsCategoryEnum.enumValues[number])       : undefined,
    filters?.department ? eq(dmsDocuments.department, filters.department as typeof dmsDepartmentEnum.enumValues[number])   : undefined,
    filters?.typeCode    ? sql`${dmsDocuments.documentNumber} LIKE ${filters.typeCode + '-%'}`          : undefined,
    filters?.processCode ? sql`${dmsDocuments.documentNumber} LIKE ${'%-' + filters.processCode + '-%'}` : undefined,
    filters?.search ? or(
      ilike(dmsDocuments.title,          `%${filters.search}%`),
      ilike(dmsDocuments.documentNumber, `%${filters.search}%`),
    ) : undefined,
  ].filter(Boolean)

  const [rows, [{ total }]] = await Promise.all([
    db.select({
        id:               dmsDocuments.id,
        documentNumber:   dmsDocuments.documentNumber,
        title:            dmsDocuments.title,
        category:         dmsDocuments.category,
        department:       dmsDocuments.department,
        status:           dmsDocuments.status,
        confidentiality:  dmsDocuments.confidentiality,
        isoClauses:       dmsDocuments.isoClauses,
        tags:             dmsDocuments.tags,
        effectiveDate:    dmsDocuments.effectiveDate,
        nextReviewDate:   dmsDocuments.nextReviewDate,
        ownerId:          dmsDocuments.ownerId,
        ownerName:        ownerUsers.name,
        authorId:         dmsDocuments.authorId,
        authorName:       authorUsers.name,
        currentVersionId: dmsDocuments.currentVersionId,
        assetUrl:          cloudinaryAssets.secureUrl,
        legacyReference:   dmsDocuments.legacyReference,
        rowHighlight:      dmsDocuments.rowHighlight,
        versionLabel:      dmsDocuments.versionLabel,
        storageType:       dmsDocuments.storageType,
        managedByPassword: dmsDocuments.managedByPassword,
        observations:      dmsDocuments.observations,
        createdAt:         dmsDocuments.createdAt,
        updatedAt:         dmsDocuments.updatedAt,
      })
      .from(dmsDocuments)
      .leftJoin(ownerUsers,  eq(ownerUsers.id,  dmsDocuments.ownerId))
      .leftJoin(authorUsers, eq(authorUsers.id, dmsDocuments.authorId))
      .leftJoin(
        cloudinaryAssets,
        eq(
          cloudinaryAssets.id,
          sql`(
            SELECT cv.cloudinary_asset_id FROM dms_document_versions cv
            WHERE cv.id = ${dmsDocuments.currentVersionId}
            LIMIT 1
          )`,
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(dmsDocuments.documentNumber))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` })
      .from(dmsDocuments)
      .where(and(...conditions)),
  ])

  return { rows: rows as DmsDocRow[], total: Number(total) }
}

export const listDmsDocuments = _listDmsDocuments

export async function createDmsDocument(
  input: DmsCreateInput,
): Promise<typeof dmsDocuments.$inferSelect> {
  const [doc] = await db
    .insert(dmsDocuments)
    .values({
      documentNumber:      input.documentNumber,
      title:               input.title,
      category:            input.category,
      department:          input.department,
      isoClauses:          input.isoClauses ?? [],
      confidentiality:     input.confidentiality ?? 'internal',
      tags:                input.tags ?? [],
      ownerId:             input.ownerId,
      authorId:            input.authorId,
      departmentManagerId: null,
      status:              'draft',
      rowHighlight:        'green',
      versionLabel:        input.versionLabel ?? null,
      storageType:         input.storageType ?? null,
      managedByPassword:   input.managedByPassword ?? false,
      observations:        input.observations ?? null,
      legacyReference:     input.legacyReference ?? null,
      effectiveDate:       input.effectiveDate ?? null,
      nextReviewDate:      input.nextReviewDate ?? null,
      createdBy:           input.createdBy,
    })
    .returning()
  return doc
}

export async function getDmsDocumentByCode(
  documentNumber: string,
): Promise<DmsDocRow | null> {
  const ownerUsers  = aliasedTable(users, 'owner_u')
  const authorUsers = aliasedTable(users, 'author_u')

  const [row] = await db
    .select({
      id:               dmsDocuments.id,
      documentNumber:   dmsDocuments.documentNumber,
      title:            dmsDocuments.title,
      category:         dmsDocuments.category,
      department:       dmsDocuments.department,
      status:           dmsDocuments.status,
      confidentiality:  dmsDocuments.confidentiality,
      isoClauses:       dmsDocuments.isoClauses,
      tags:             dmsDocuments.tags,
      effectiveDate:    dmsDocuments.effectiveDate,
      nextReviewDate:   dmsDocuments.nextReviewDate,
      ownerId:          dmsDocuments.ownerId,
      ownerName:        ownerUsers.name,
      authorId:         dmsDocuments.authorId,
      authorName:       authorUsers.name,
      currentVersionId: dmsDocuments.currentVersionId,
      assetUrl:         cloudinaryAssets.secureUrl,
      legacyReference:  dmsDocuments.legacyReference,
      rowHighlight:     dmsDocuments.rowHighlight,
      createdAt:        dmsDocuments.createdAt,
      updatedAt:        dmsDocuments.updatedAt,
    })
    .from(dmsDocuments)
    .leftJoin(ownerUsers,  eq(ownerUsers.id,  dmsDocuments.ownerId))
    .leftJoin(authorUsers, eq(authorUsers.id, dmsDocuments.authorId))
    .leftJoin(
      cloudinaryAssets,
      eq(
        cloudinaryAssets.id,
        sql`(
          SELECT cv.cloudinary_asset_id FROM dms_document_versions cv
          WHERE cv.id = ${dmsDocuments.currentVersionId}
          LIMIT 1
        )`,
      ),
    )
    .where(
      and(
        eq(dmsDocuments.documentNumber, documentNumber),
        isNull(dmsDocuments.deletedAt),
      ),
    )
    .limit(1)
  return (row as DmsDocRow) ?? null
}
