import type { SupabaseClient } from '@supabase/supabase-js'
import { errors } from './errors'
import { writeJewelryCatalogChange } from './jewelry-catalog-audit'
import { normalizeJewelryCatalogTags } from './jewelry-catalog-tags'
import {
  normalizeCollectionStorageName,
  normalizeItemNumber,
} from './jewelry-database'
import type {
  ReportJewelryCatalogIssueInput,
  ReportJewelryCatalogIssueResult,
} from './types'

type DesignRow = {
  id: string
  item_number: string
  design_name: string
  collection_id: string | null
  material: string | null
  main_stone: string | null
  bp_msrp: number | null
  canonical_photo_url: string | null
  special_features: string | null
  length_info: string | null
  type_prefix: string
  search_tags: string[] | null
  collection:
    | { id: string; name: string; collection_year: number | null }
    | { id: string; name: string; collection_year: number | null }[]
    | null
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isApprovedPhotoUrl(photoUrl: string, designId: string): boolean {
  try {
    const url = new URL(photoUrl)
    return url.pathname.includes(`/approved/${designId}/`)
  } catch {
    return false
  }
}

function snapshotDesign(row: DesignRow) {
  const collectionRel = row.collection
  const collection = Array.isArray(collectionRel) ? collectionRel[0] : collectionRel

  return {
    itemNumber: row.item_number,
    designName: row.design_name,
    collectionId: row.collection_id,
    collectionName: collection?.name ?? null,
    collectionYear: collection?.collection_year ?? null,
    material: row.material,
    mainStone: row.main_stone,
    canonicalPhotoUrl: row.canonical_photo_url,
    specialFeatures: row.special_features,
    lengthInfo: row.length_info,
    typePrefix: row.type_prefix,
    searchTags: Array.isArray(row.search_tags) ? row.search_tags : [],
  }
}

function normalizeCorrectionYear(collectionYear: number | null | undefined): number | null | undefined {
  if (collectionYear === undefined) return undefined
  if (collectionYear === null) return null
  if (!Number.isInteger(collectionYear) || collectionYear < 2020 || collectionYear > 2040) {
    throw errors.INVALID_INPUT(
      'collectionYear must be between 2020 and 2040',
      'Use a four-digit collection year between 2020 and 2040.',
    )
  }
  return collectionYear
}

async function findOrCreateCollectionId(
  supabase: SupabaseClient,
  rawCollectionName: string,
  collectionYear?: number | null,
): Promise<{ id: string; collectionYear: number | null }> {
  const name = rawCollectionName.trim()
  if (!name) {
    throw errors.INVALID_INPUT(
      'collectionName required',
      'I need the corrected collection name before I can update that piece.',
    )
  }

  const normalizedYear = normalizeCorrectionYear(collectionYear)
  const storageName = normalizeCollectionStorageName(name, normalizedYear)

  const { data: existing, error: lookupErr } = await supabase
    .from('collections')
    .select('id, collection_year')
    .eq('name', storageName)
    .maybeSingle()
  if (lookupErr) throw lookupErr
  if (existing?.id) {
    if (normalizedYear !== undefined && normalizedYear !== existing.collection_year) {
      const { data: updated, error: updateErr } = await supabase
        .from('collections')
        .update({ collection_year: normalizedYear })
        .eq('id', existing.id)
        .select('id, collection_year')
        .single()
      if (updateErr) throw updateErr
      return {
        id: updated.id as string,
        collectionYear: (updated.collection_year as number | null) ?? null,
      }
    }

    return {
      id: existing.id as string,
      collectionYear: (existing.collection_year as number | null) ?? null,
    }
  }

  const bareName = normalizeCollectionStorageName(name, null)
  if (normalizedYear !== undefined && normalizedYear !== null && storageName !== bareName) {
    const { data: legacyExisting, error: legacyLookupErr } = await supabase
      .from('collections')
      .select('id, collection_year')
      .eq('name', bareName)
      .maybeSingle()
    if (legacyLookupErr) throw legacyLookupErr
    if (legacyExisting?.id) {
      const { data: updated, error: updateErr } = await supabase
        .from('collections')
        .update({ name: storageName, collection_year: normalizedYear })
        .eq('id', legacyExisting.id)
        .select('id, collection_year')
        .single()
      if (updateErr) throw updateErr
      return {
        id: updated.id as string,
        collectionYear: (updated.collection_year as number | null) ?? null,
      }
    }
  }

  const { data: created, error: insertErr } = await supabase
    .from('collections')
    .insert({ name: storageName, collection_year: normalizedYear ?? null })
    .select('id, collection_year')
    .single()
  if (insertErr) throw insertErr

  return {
    id: created.id as string,
    collectionYear: (created.collection_year as number | null) ?? null,
  }
}

async function updateExistingCollectionYear(
  supabase: SupabaseClient,
  collectionId: string | null,
  collectionYear: number | null,
) {
  if (!collectionId) {
    throw errors.INVALID_INPUT(
      'collectionName required for collectionYear correction',
      'I need the collection name before I can save a collection year for that piece.',
    )
  }

  const { data, error } = await supabase
    .from('collections')
    .update({ collection_year: collectionYear })
    .eq('id', collectionId)
    .select('id, collection_year')
    .single()
  if (error) throw error

  return (data.collection_year as number | null) ?? null
}

export async function reportJewelryCatalogIssue(
  supabase: SupabaseClient,
  input: ReportJewelryCatalogIssueInput,
): Promise<ReportJewelryCatalogIssueResult> {
  if (!input.repId) throw errors.UNAUTHORIZED('repId required')

  const itemNumber = normalizeItemNumber(input.itemNumber)
  if (!itemNumber) throw errors.MISSING_ITEM_INPUT()

  if (!input.reason.trim()) {
    throw errors.INVALID_INPUT(
      'reason required',
      'Tell me what looks wrong so I can record the catalog correction clearly.',
    )
  }

  const { data: rawDesign, error: lookupErr } = await supabase
    .from('jewelry_designs')
    .select(
      'id, item_number, design_name, collection_id, material, main_stone, bp_msrp, canonical_photo_url, special_features, length_info, type_prefix, search_tags, collection:collections(id, name, collection_year)',
    )
    .eq('item_number', itemNumber)
    .maybeSingle()
  if (lookupErr) throw lookupErr
  if (!rawDesign) {
    throw errors.INVALID_INPUT(
      `catalog design not found for item ${itemNumber}`,
      `I couldn't find ${itemNumber} in the jewelry catalog yet.`,
    )
  }

  const design = rawDesign as DesignRow
  const beforeState = snapshotDesign(design)

  await writeJewelryCatalogChange(supabase, {
    designId: design.id,
    repId: input.repId,
    conversationId: input.conversationId ?? null,
    changeType: 'report_issue',
    issueType: input.issueType,
    reason: input.reason,
    beforeState,
    afterState: beforeState,
  })

  const correction = input.correction
  if (!correction) {
    return {
      designId: design.id,
      itemNumber,
      changedFields: [],
      issueLogged: true,
      corrected: false,
    }
  }

  const patch: Record<string, unknown> = {}
  const changedFields: string[] = []

  const designName = trimOptional(correction.designName)
  if (designName && designName !== design.design_name) {
    patch.design_name = designName
    changedFields.push('designName')
  }

  const collectionName = trimOptional(correction.collectionName)
  if (collectionName) {
    const collection = await findOrCreateCollectionId(
      supabase,
      collectionName,
      correction.collectionYear,
    )
    if (collection.id !== design.collection_id) {
      patch.collection_id = collection.id
      changedFields.push('collectionName')
    }
    const beforeCollection = snapshotDesign(design)
    if (correction.collectionYear !== undefined && collection.collectionYear !== beforeCollection.collectionYear) {
      changedFields.push('collectionYear')
    }
  } else if (correction.collectionYear !== undefined) {
    const year = normalizeCorrectionYear(correction.collectionYear)
    const beforeCollection = snapshotDesign(design)
    if (year !== beforeCollection.collectionYear) {
      await updateExistingCollectionYear(supabase, design.collection_id, year ?? null)
      changedFields.push('collectionYear')
    }
  }

  if (correction.material !== undefined && correction.material !== design.material) {
    patch.material = correction.material
    changedFields.push('material')
  }

  if (correction.mainStone !== undefined && correction.mainStone !== design.main_stone) {
    patch.main_stone = correction.mainStone
    changedFields.push('mainStone')
  }

  if (
    correction.specialFeatures !== undefined &&
    correction.specialFeatures !== design.special_features
  ) {
    patch.special_features = correction.specialFeatures
    changedFields.push('specialFeatures')
  }

  if (correction.lengthInfo !== undefined && correction.lengthInfo !== design.length_info) {
    patch.length_info = correction.lengthInfo
    changedFields.push('lengthInfo')
  }

  if (correction.canonicalPhotoUrl !== undefined) {
    if (!isApprovedPhotoUrl(correction.canonicalPhotoUrl, design.id)) {
      throw errors.INVALID_INPUT(
        'canonical photo must be an approved pipeline asset',
        'I can only replace the catalog photo with an approved jewelry image.',
      )
    }
    if (correction.canonicalPhotoUrl !== design.canonical_photo_url) {
      patch.canonical_photo_url = correction.canonicalPhotoUrl
      changedFields.push('canonicalPhotoUrl')
    }
  }

  if (correction.searchTags !== undefined) {
    const searchTags = normalizeJewelryCatalogTags(correction.searchTags)
    const currentTags = Array.isArray(design.search_tags) ? design.search_tags : []
    if (JSON.stringify(searchTags) !== JSON.stringify(currentTags)) {
      patch.search_tags = searchTags
      changedFields.push('searchTags')
    }
  }

  if (changedFields.length === 0) {
    return {
      designId: design.id,
      itemNumber,
      changedFields: [],
      issueLogged: true,
      corrected: false,
    }
  }

  const correctedAt = new Date().toISOString()
  patch.last_corrected_by_rep_id = input.repId
  patch.last_corrected_at = correctedAt
  patch.updated_at = correctedAt

  const { data: rawUpdated, error: updateErr } = await supabase
    .from('jewelry_designs')
    .update(patch)
    .eq('id', design.id)
    .select(
      'id, item_number, design_name, collection_id, material, main_stone, bp_msrp, canonical_photo_url, special_features, length_info, type_prefix, search_tags, collection:collections(id, name, collection_year)',
    )
    .single()
  if (updateErr) throw updateErr

  const updated = rawUpdated as DesignRow

  await writeJewelryCatalogChange(supabase, {
    designId: design.id,
    repId: input.repId,
    conversationId: input.conversationId ?? null,
    changeType: changedFields.includes('canonicalPhotoUrl')
      ? 'replace_canonical_photo'
      : 'correct_design_fields',
    issueType: input.issueType,
    reason: input.reason,
    beforeState,
    afterState: snapshotDesign(updated),
  })

  return {
    designId: updated.id,
    itemNumber: updated.item_number,
    changedFields,
    issueLogged: true,
    corrected: true,
  }
}
