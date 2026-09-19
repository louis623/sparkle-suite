export const ER13229_LIVE_SEQUENCE = {
  itemNumber: 'ER13229',
  designName: 'The Florence Earrings',
  collectionName: 'July Birthday',
  collectionYear: 2026,
  labelPhotoUrl: 'data:image/jpeg;base64,TEFCRUw=',
  jewelryPhotoUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
  confirmationText:
    'That is correct. This is the July Birthday collection, 2026.',
  turns: [
    {
      kind: 'start',
      text: 'Add a piece to Dance Floor',
    },
    {
      kind: 'label_photo',
      fileRole: 'label_details',
      fileName: 'ER13229-label.jpg',
    },
    {
      kind: 'jewelry_photo',
      fileRole: 'jewelry_front',
      fileName: 'ER13229-jewelry-boxed-front.jpg',
    },
    {
      kind: 'collection_confirmation',
      text: 'That is correct. This is the July Birthday collection, 2026.',
    },
  ],
  hardFailPhrases: [
    "I can't actually add listings",
    'Log into your workspace and add it manually',
    'The photo of the earrings needs',
    'Unboxed',
    'Plain background',
    'Packaging is too prominent',
    'backend',
    'incomplete data on file',
    'report this to Louis',
    'I still need these details before I can save this listing: .',
  ],
} as const
