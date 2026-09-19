import { describe, expect, it } from 'vitest'

import {
  assignDeclaredPhotoRolesForTurn,
  findWorkflowJewelryFrontForReadiness,
  inferExplicitAttachmentRole,
  isAcceptedCustomerFacingWorkflowPhoto,
  isBarredFromCustomerFacingMedia,
  stampSoleReadinessJewelryFrontCandidate,
  workflowPhotoSatisfiesJewelryFront,
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

  it('treats a single boxed-display photo as jewelry-front so a clear shot already in thread counts', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 1,
        inheritedRole: 'unknown',
        latestUserText: 'Original Earrings, standard',
        existingPhotos: [],
        visualRoles: ['uncertain'],
      }),
    ).toEqual(['jewelry_front'])
  })

  it('does not let a visual label overwrite a jewelry ask on a single-photo turn', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 1,
        inheritedRole: 'jewelry_front',
        latestUserText: '',
        existingPhotos: [
          {
            declaredRole: 'label_details',
          },
        ],
        visualRoles: ['label_or_packaging'],
      }),
    ).toEqual(['jewelry_front'])
  })

  it('still pins a visual label when the turn was not a jewelry ask', () => {
    expect(
      assignDeclaredPhotoRolesForTurn({
        attachmentCount: 1,
        inheritedRole: 'unknown',
        latestUserText: '',
        existingPhotos: [],
        visualRoles: ['label_or_packaging'],
      }),
    ).toEqual(['label_details'])
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

  it('keeps listing-only non-item-number dancers out of catalog canonical fallback', () => {
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: undefined,
        hasWorkflowJewelryPhoto: false,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: null,
      }),
    ).toBe(false)
  })

  it('applies jewelry-over-label on the shared pipeline, not a per-rep branch', () => {
    expect(
      shouldFallBackToCatalogCanonicalPhoto({
        listingPhotoUrl: undefined,
        hasWorkflowJewelryPhoto: true,
        catalogHasCanonicalPhoto: true,
        resolvedDesignId: 'design-any-rep',
      }),
    ).toBe(false)
  })

  it('lets a boxed-display photo already in the thread satisfy jewelry-front without picking by order', () => {
    const boxed = {
      declaredRole: 'unknown' as const,
      visualRole: 'uncertain',
      quality: 'usable',
      imageUrl: 'boxed-earrings',
    }
    const leftoverLabel = {
      declaredRole: 'label_details' as const,
      visualRole: 'label_or_packaging',
      quality: 'blocked',
      imageUrl: 'unreadable-label',
    }
    expect(workflowPhotoSatisfiesJewelryFront(boxed)).toBe(true)
    expect(workflowPhotoSatisfiesJewelryFront(leftoverLabel)).toBe(false)
    expect(
      findWorkflowJewelryFrontForReadiness([leftoverLabel, boxed])?.imageUrl,
    ).toBe('boxed-earrings')
    expect(
      findWorkflowJewelryFrontForReadiness([
        { ...boxed, imageUrl: 'first-uncertain' },
        { ...boxed, imageUrl: 'second-uncertain' },
      ]),
    ).toBeUndefined()
  })

  it('stamps the sole boxed/uncertain readiness candidate to jewelry_front so publish sees the same photo', () => {
    const boxed = {
      declaredRole: 'unknown' as const,
      visualRole: 'uncertain' as const,
      quality: 'usable',
      roleConfirmed: false,
      imageUrl: 'boxed-earrings',
      notes: [] as string[],
    }
    const leftoverLabel = {
      declaredRole: 'label_details' as const,
      visualRole: 'label_or_packaging' as const,
      quality: 'blocked' as const,
      imageUrl: 'unreadable-label',
      notes: [] as string[],
    }
    const stamped = stampSoleReadinessJewelryFrontCandidate([leftoverLabel, boxed])
    expect(stamped[0]).toMatchObject({
      declaredRole: 'label_details',
      imageUrl: 'unreadable-label',
    })
    expect(stamped[1]).toMatchObject({
      declaredRole: 'jewelry_front',
      visualRole: 'uncertain',
      roleConfirmed: true,
      imageUrl: 'boxed-earrings',
    })
    expect(isAcceptedCustomerFacingWorkflowPhoto(stamped[1])).toBe(true)
    expect(isAcceptedCustomerFacingWorkflowPhoto(boxed)).toBe(false)
    expect(resolveWorkflowCustomerFacingPhoto([leftoverLabel, boxed])?.imageUrl).toBe(
      'boxed-earrings',
    )

    const twoUncertain = stampSoleReadinessJewelryFrontCandidate([
      { ...boxed, imageUrl: 'first-uncertain' },
      { ...boxed, imageUrl: 'second-uncertain' },
    ])
    expect(twoUncertain.map((photo) => photo.declaredRole)).toEqual([
      'unknown',
      'unknown',
    ])
    expect(resolveWorkflowCustomerFacingPhoto(twoUncertain)).toBeNull()
  })

  it('remaps a visual label to uncertain when the sole readiness candidate is stamped jewelry_front', () => {
    const boxedHexCard = {
      declaredRole: 'unknown' as const,
      visualRole: 'uncertain' as const,
      quality: 'usable' as const,
      roleConfirmed: false,
      imageUrl: 'boxed-hex-card',
      notes: [] as string[],
    }
    const inheritedLabelAsFront = {
      declaredRole: 'jewelry_front' as const,
      visualRole: 'label_or_packaging' as const,
      quality: 'usable' as const,
      roleConfirmed: true,
      imageUrl: 'boxed-hex-card',
      notes: [] as string[],
    }
    const remapped = stampSoleReadinessJewelryFrontCandidate([inheritedLabelAsFront])
    expect(remapped[0]).toMatchObject({
      declaredRole: 'jewelry_front',
      visualRole: 'uncertain',
      imageUrl: 'boxed-hex-card',
    })
    expect(isAcceptedCustomerFacingWorkflowPhoto(remapped[0])).toBe(true)
    expect(isAcceptedCustomerFacingWorkflowPhoto(inheritedLabelAsFront)).toBe(
      false,
    )
    expect(isAcceptedCustomerFacingWorkflowPhoto(boxedHexCard)).toBe(false)
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
    ).toBe('gold plating|lapis magnesite')
    expect(
      catalogVariantPhotoAssetKey({
        material: 'Rhodium Plating',
        mainStone: 'Malachite Magnesite',
      }),
    ).toBe('rhodium plating|malachite magnesite')
  })
})
