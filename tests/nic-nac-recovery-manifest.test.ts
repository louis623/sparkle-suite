import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const manifestPath = path.resolve(
  'docs/sparkle-suite/audits/2026-09-13-nic-nac-heather-recovery-manifest.json',
)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  schemaVersion: number
  batchId: string
  sourceWindow: { repId: string }
  entries: Array<{
    listingId: string
    designId: string
    decision: string
    currentPhotoSha256: string
    selectedPhotoId: string
    selectedPhotoSha256: string
    rarityClassification: string
  }>
}
const supplementalManifest = JSON.parse(
  readFileSync(
    path.resolve(
      'docs/sparkle-suite/audits/2026-09-13-nic-nac-er38483-recovery-manifest.json',
    ),
    'utf8',
  ),
) as typeof manifest

describe('Nic-Nac historical listing repair manifest', () => {
  it('pins exactly eleven reviewed records with unique database identities', () => {
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.batchId).toMatch(/^[0-9a-f-]{36}$/)
    expect(manifest.sourceWindow.repId).toBe('9a971c05-3631-443e-bcb8-4e9a26e15885')
    expect(manifest.entries).toHaveLength(11)
    expect(new Set(manifest.entries.map((entry) => entry.listingId)).size).toBe(11)
    expect(new Set(manifest.entries.map((entry) => entry.designId)).size).toBe(11)
    expect(new Set(manifest.entries.map((entry) => entry.selectedPhotoId)).size).toBe(11)
  })

  it('records eight replacements, three retained sources, and no inferred rarity', () => {
    expect(
      manifest.entries.filter((entry) => entry.decision === 'replace_from_workflow_photo'),
    ).toHaveLength(8)
    expect(
      manifest.entries.filter((entry) => entry.decision === 'retain_source_photo'),
    ).toHaveLength(3)
    expect(manifest.entries.every((entry) => entry.rarityClassification === 'standard')).toBe(true)
  })

  it('requires complete SHA-256 guards and different bytes for every replacement', () => {
    for (const entry of manifest.entries) {
      expect(entry.currentPhotoSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(entry.selectedPhotoSha256).toMatch(/^[0-9a-f]{64}$/)
      if (entry.decision === 'replace_from_workflow_photo') {
        expect(entry.selectedPhotoSha256).not.toBe(entry.currentPhotoSha256)
      } else {
        expect(entry.selectedPhotoSha256).toBe(entry.currentPhotoSha256)
      }
    }
  })

  it('pins the one older mismatch found by the full-current-inventory review', () => {
    expect(supplementalManifest.schemaVersion).toBe(1)
    expect(supplementalManifest.entries).toHaveLength(1)
    expect(supplementalManifest.entries[0]).toMatchObject({
      listingId: 'b4e9e363-cb09-442b-b5e7-e334927a22bd',
      designId: 'f81ff785-84a2-4983-93d7-6f634a7a98b8',
      selectedPhotoId: '06bffebd-c246-4071-9129-949c98074020',
      decision: 'replace_from_workflow_photo',
      rarityClassification: 'standard',
    })
    expect(supplementalManifest.entries[0].selectedPhotoSha256).not.toBe(
      supplementalManifest.entries[0].currentPhotoSha256,
    )
  })

  it('keeps all nine reviewed replacements uniquely tied to one listing and source photo', () => {
    const replacements = [...manifest.entries, ...supplementalManifest.entries].filter(
      (entry) => entry.decision === 'replace_from_workflow_photo',
    )
    expect(replacements).toHaveLength(9)
    expect(new Set(replacements.map((entry) => entry.listingId)).size).toBe(9)
    expect(new Set(replacements.map((entry) => entry.selectedPhotoId)).size).toBe(9)
  })
})
