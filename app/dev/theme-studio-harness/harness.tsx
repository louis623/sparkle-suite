'use client'

import { useState } from 'react'
import { ThemeStudio } from '@/app/nic-nac/components/ThemeStudio'
import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

const SAMPLE_IDS = new Set([
  'gobble_and_fizz',
  'pie_please',
  'silver_bells',
  'christmas_jewelry_workshop',
  'starlight_christmas_hollow',
  'macies_christmas_globe',
  'halloween_pumpkin_cat',
  'halloween_pumpkin_witch',
  'rose_champagne',
  'rose_gold',
  'midnight_rose',
  'pearl_rose',
  'sunset_beach',
  'amethyst',
  'black_diamond',
  'moonstone',
  'sparkle_suite_morganite',
  'gilded_autumn',
  'fall_owl_harvest_moon',
])

const CARDS = AMETHYST_SKIN_CARDS.filter((card) => SAMPLE_IDS.has(card.id))
const NOV_23 = new Date('2026-11-23T17:00:00.000Z')

export function ThemeStudioHarness() {
  const [draft, setDraft] = useState('silver_bells')
  return (
    <div data-testid="theme-studio-harness">
      <ThemeStudio
        status="ready"
        cards={CARDS}
        savedThemeId="silver_bells"
        draftThemeId={draft}
        onDraftThemeChange={setDraft}
        now={NOV_23}
        loadPreview={async ({ page }) => ({
          status: 200,
          html: `<!DOCTYPE html><html><body style="margin:0;font-family:Georgia,serif"><p style="padding:24px">Sample ${page} preview. Customers still see Silver Bells until you save.</p></body></html>`,
          engine: 'ssr',
        })}
      />
    </div>
  )
}
