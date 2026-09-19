import { describe, expect, it } from 'vitest'

import {
  assignDeclaredPhotoRolesForTurn,
  inferExplicitAttachmentRole,
  isAcceptedCustomerFacingWorkflowPhoto,
  isBarredFromCustomerFacingMedia,
} from '@/lib/nic-nac/workflows/workflow-photo-roles'
import {
  catalogVariantPhotoAssetKey,
  hasUsableWorkflowJewelryPhoto,
  resolveWorkflowCustomerFacingPhoto,
  selectWorkflowJewelryPhoto,
  shouldFallBackToCatalogCanonicalPhoto,
} from '@/lib/nic-nac/workflows/workflow-photo-selection'

describe('two-photo Add Dancer role assignment', () => {
  it('does not stamp both same-turn photos as jewelry after a jewelry ask', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 2,
        inheritedRole: 'jewelry_front',
        latestUserText: '',
        existingPhotos: [],
        visualRoles: ['uncertain', 'uncertain'],
      }),
    ).toEqual(['unknown', 'unknown'])
  })

  it('does not invent label/jewelry from attachment order when both visuals are uncertain', () => {
    const jewelryFirst = assignDeclaredPhotoRolesForTurn({
      attachmentCount: 2,
      inheritedRole: 'unknown',
      latestUserText: '',
      existingPhotos: [],
      visualRoles: ['uncertain', 'uncertain'],
    })
    expect(jewelryFirst).toEqual(['unknown', 'unknown'])
    expect(jewelryFirst[0]).not.toBe('label_details')

    const photos = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        attachmentIndex: 1,
        declaredRole: jewelryFirst[0],
        visualRole: 'uncertain',
        quality: 'usable',
        imageUrl: 'jewelry-first',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        attachmentIndex: 2,
        declaredRole: jewelryFirst[1],
        visualRole: 'uncertain',
        quality: 'usable',
        imageUrl: 'label-second',
      },
    ]
    expect(selectWorkflowJewelryPhoto(photos, {})).toBeNull()

    const laterPin = [
      {
        ...photos[0],
        declaredRole: 'jewelry_front' as const,
        visualRole: 'jewelry' as const,
      },
      {
        ...photos[1],
        declaredRole: 'label_details' as const,
        visualRole: 'label_or_packaging' as const,
      },
    ]
    expect(selectWorkflowJewelryPhoto(laterPin, {})?.imageUrl).toBe('jewelry-first')
    expect(selectWorkflowJewelryPhoto(laterPin, {})?.imageUrl).not.toBe(
      'label-second',
    )
  })

  it('pins a visual label even when it is attached after the jewelry photo', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 2,
        inheritedRole: 'jewelry_front',
        latestUserText: '',
        existingPhotos: [],
        visualRoles: ['jewelry', 'label_or_packaging'],
      }),
    ).toEqual(['jewelry_front', 'label_details'])
  })

  it('treats the remaining unknown photo as jewelry after a visual label pin', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 2,
        inheritedRole: 'unknown',
        latestUserText: '',
        existingPhotos: [],
        visualRoles: ['label_or_packaging', 'uncertain'],
      }),
    ).toEqual(['label_details', 'jewelry_front'])
  })

  it('honors first-is-label second-is-jewelry wording', () => {
    expect(
      inferExplicitAttachmentRole(
        'First photo is the label, second is the jewelry.',
        0,
        2,
      ),
    ).toBe('label_details')
    expect(
      inferExplicitAttachmentRole(
        'First photo is the label, second is the jewelry.',
        1,
        2,
      ),
    ).toBe('jewelry_front')
  })
})

describe('customer-facing media selection', () => {
  const label = {
    id: '11111111-1111-4111-8111-111111111111',
    attachmentIndex: 1,
    declaredRole: 'label_details' as const,
    visualRole: 'label_or_packaging',
    quality: 'usable',
    imageUrl: 'label-photo',
  }
  const jewelry = {
    id: '22222222-2222-4222-8222-222222222222',
    attachmentIndex: 2,
    declaredRole: 'jewelry_front' as const,
    visualRole: 'jewelry',
    quality: 'usable',
    imageUrl: 'jewelry-photo',
  }

  it('bars label photos from becoming customer-facing media', () => {
    expect(isBarredFromCustomerFacingMedia(label)).toBe(true)
    expect(isAcceptedCustomerFacingWorkflowPhoto(label)).toBe(false)
    expect(selectWorkflowJewelryPhoto([label, jewelry], { selectedPhotoId: label.id })).toBeNull()
  })

  it('publishes the jewelry photo from a two-photo intake even if the model points at the label', () => {
    const selected = resolveWorkflowCustomerFacingPhoto([label, jewelry], {
      selectedPhotoId: label.id,
    })
    expect(selected?.imageUrl).toBe('jewelry-photo')
    expect(selected?.imageUrl).not.toBe('label-photo')
  })

  it('prefers a jewelry visual over a later inherited jewelry_front that is actually a label', () => {
    const inheritedLabel = {
      id: '33333333-3333-4333-8333-333333333333',
      attachmentIndex: 2,
      declaredRole: 'jewelry_front' as const,
      visualRole: 'label_or_packaging',
      quality: 'usable',
      imageUrl: 'inherited-label',
    }
    expect(
      selectWorkflowJewelryPhoto([jewelry, inheritedLabel], {})?.imageUrl,
    ).toBe('jewelry-photo')
  })

  it('does not fall back to a shared catalog canonical when a jewelry-front photo exists', () => {
    expect(hasUsableWorkflowJewelryPhoto([label, jewelry], {})).toBe(true)
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: undefined,
        hasWorkflowJewelryPhoto: true,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: 'design-nk88350-rhodium',
      }),
    ).toBe(false)
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: undefined,
        hasWorkflowJewelryPhoto: false,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: 'design-nk88350-rhodium',
      }),
    ).toBe(true)
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: 'https://cdn.example.com/listing-jewelry.png',
        hasWorkflowJewelryPhoto: false,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: 'design-nk88350-rhodium',
      }),
    ).toBe(false)
  })

  it('never uses another variant’s canonical just because the item number matches', () => {
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: undefined,
        hasWorkflowJewelryPhoto: false,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: null,
      }),
    ).toBe(false)
    expect(
      catalogVariantPhotoAssetKey({
        designId: 'design-nk88350-rhodium',
        material: 'Rhodium Plating',
        mainStone: 'Malachite Magnesite',
      }),
    ).toBe('design-nk88350-rhodium')
    expect(
      catalogVariantPhotoAssetKey({
        designId: 'design-nk88350-gold',
        material: 'Gold Plating',
        mainStone: 'Lapis Magnesite',
      }),
    ).toBe('design-nk88350-gold')
    expect(
      catalogVariantPhotoAssetKey({
        material: 'Gold Plating',
        mainStone: 'Lapis Magnesite',
      }),
    ).not.toBe(
      catalogVariantPhotoAssetKey({
        material: 'Rhodium Plating',
        mainStone: 'Malachite Magnesite',
      }),
    )
  })
})
