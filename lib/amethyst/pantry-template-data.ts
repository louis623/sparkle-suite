import { buildPublicSiteVisibilityScript, type PublicSiteVisibility } from '@/lib/public-site/visibility'
import {
  BLING_KITCHEN_PROFILE,
  BLING_KITCHEN_RECIPE_COUNT,
} from '@/lib/bling-kitchen/profile'
import { recipes as blingKitchenRecipes } from '@/lib/bling-kitchen/recipes'
import type { PublicSiteRecipe } from '@/lib/services/types'

import {
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  normalizeAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import type { AmethystRuntimeContext } from './homepage-template-data'
import { getPublicRepName } from './public-rep-name'

export interface AmethystPantryRecipe {
  id: string | number
  title: string
  description: string
  category: string
  prepTime: string
  servings: number | null
  image: string
  imagePosition?: string
  modalImage?: string
  modalImagePosition?: string
  tiktokUrl?: string
  ingredients: string[]
  steps: string[]
  note?: string
}

export interface AmethystPantryTemplateData {
  visibility?: PublicSiteVisibility
  publicSiteVariant?: 'bling_kitchen_hybrid'
  appearancePreset: AmethystAppearancePresetId
  repName: string
  businessName: string
  teamName: string
  tagline: string
  eyebrow: string
  title: string
  subtitle: string
  introText: string
  heroImageUrl: string
  sourceSite: string
  recipeCount: number
  recipes: AmethystPantryRecipe[]
  categoryOrder: string[]
  featuredCategoryGroups: Array<{
    title: string
    subtitle: string
    categories: string[]
  }>
  links: {
    home: string
    trade: string
    join: string
    pantry: string
    shop: string
    tiktok: string
    facebookVip: string
    contact: string
  }
}

function normalizePantryRecipeCategory(category: string) {
  return category === 'Baking' || category === 'Dessert' || category === 'No-Bake Treats'
    ? 'Baking & Sweets'
    : category
}

export const defaultAmethystPantryTemplateData: AmethystPantryTemplateData = {
  publicSiteVariant: 'bling_kitchen_hybrid',
  appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
  repName: BLING_KITCHEN_PROFILE.publicName,
  businessName: BLING_KITCHEN_PROFILE.businessName,
  teamName: BLING_KITCHEN_PROFILE.teamName,
  tagline: 'Serving Sparkle from the Heart of the Home',
  eyebrow: 'Recipes with Heather',
  title: 'In the Pantry',
  subtitle:
    'Heather shares family recipes, kitchen notes, and favorite treats alongside the BlingKitchen live reveal community.',
  introText:
    `Browse ${BLING_KITCHEN_RECIPE_COUNT} recipes from Heather's BlingKitchen pantry, including family favorites, kitchen notes, and live-show community treats.`,
  heroImageUrl: BLING_KITCHEN_PROFILE.pantryHeroImageUrl,
  sourceSite: BLING_KITCHEN_PROFILE.sourceSite,
  recipeCount: BLING_KITCHEN_RECIPE_COUNT,
  recipes: blingKitchenRecipes.map((recipe) => ({
    ...recipe,
    category: normalizePantryRecipeCategory(recipe.category),
  })),
  categoryOrder: [
    'Baking & Sweets',
    'Italian Classics',
    'Weeknight Dinners',
    'Drinks & Extras',
    'Holiday Favorites',
    'Breakfast',
    'Appetizer',
  ],
  featuredCategoryGroups: [
    {
      title: 'Baking & Sweets',
      subtitle: 'Celebration desserts, cookies, breads, and family treats.',
      categories: ['Baking & Sweets'],
    },
    {
      title: 'Dinners & Mains',
      subtitle: 'Italian classics and weeknight dinners from Heather\'s kitchen.',
      categories: ['Italian Classics', 'Weeknight Dinners'],
    },
    {
      title: 'Extras & Celebrations',
      subtitle: 'Breakfast, drinks, and holiday favorites.',
      categories: [
        'Drinks & Extras',
        'Holiday Favorites',
        'Breakfast',
      ],
    },
  ],
  links: {
    home: '/amethyst/Homepage.html',
    trade: '/amethyst/Trade.html',
    join: '/amethyst/Join.html',
    pantry: '/amethyst/Pantry.html',
    shop: BLING_KITCHEN_PROFILE.shopUrl,
    tiktok: BLING_KITCHEN_PROFILE.tiktokUrl,
    facebookVip: BLING_KITCHEN_PROFILE.facebookVipUrl,
    contact: `mailto:${BLING_KITCHEN_PROFILE.email}`,
  },
}

export function mapPublicSiteRecipeToPantryRecipe(
  recipe: PublicSiteRecipe,
): AmethystPantryRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    category: normalizePantryRecipeCategory(recipe.category),
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    image: recipe.imageUrl,
    imagePosition: recipe.imagePosition,
    modalImage: recipe.modalImageUrl,
    modalImagePosition: recipe.modalImagePosition,
    tiktokUrl: recipe.tiktokUrl,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    note: recipe.note,
  }
}

export function buildBlingKitchenPantryTemplateData(
  recipes: AmethystPantryRecipe[] = defaultAmethystPantryTemplateData.recipes,
  options: { appearancePreset?: AmethystAppearancePresetId | string | null } = {},
): AmethystPantryTemplateData {
  return {
    ...defaultAmethystPantryTemplateData,
    appearancePreset: normalizeAmethystAppearancePreset(options.appearancePreset),
    recipes,
    recipeCount: recipes.length,
    introText:
      recipes.length > 0
        ? `Browse ${recipes.length} recipes from Heather's BlingKitchen pantry, including family favorites, kitchen notes, and live-show community treats.`
        : "Heather's Pantry recipes will appear here after they are added in Nic-Nac.",
  }
}

function safeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function buildPublicRuntimeContext(runtimeContext: AmethystRuntimeContext) {
  const repId = runtimeContext.repId?.trim()
  const publicSiteSlug = runtimeContext.publicSiteSlug?.trim().toLowerCase()

  return {
    targeted: Boolean(runtimeContext.targeted),
    ...(repId ? { repId } : {}),
    ...(publicSiteSlug ? { publicSiteSlug } : {}),
  }
}

export function applyPublicSiteSlugToPantryTemplateData(
  data: AmethystPantryTemplateData,
  slug: string | null | undefined,
): AmethystPantryTemplateData {
  const cleaned = slug?.trim().toLowerCase()
  if (!cleaned) return data

  return {
    ...data,
    links: {
      ...data.links,
      home: `/${cleaned}`,
      trade: `/${cleaned}/trade`,
      join: `/${cleaned}/join`,
      pantry: `/${cleaned}/in-the-pantry`,
    },
  }
}

export function applyCustomDomainToPantryTemplateData(
  data: AmethystPantryTemplateData,
  customDomain: string | null | undefined,
): AmethystPantryTemplateData {
  if (!customDomain?.trim()) return data

  return {
    ...data,
    links: {
      ...data.links,
      home: '/',
      trade: '/trade',
      join: '/join',
      pantry: '/in-the-pantry',
    },
  }
}

export function buildAmethystPantryBootstrapScript(
  data: AmethystPantryTemplateData = defaultAmethystPantryTemplateData,
  runtimeContext: AmethystRuntimeContext = { targeted: false },
) {
  const publicRuntimeContext = buildPublicRuntimeContext(runtimeContext)
  const publicData: AmethystPantryTemplateData = {
    ...data,
    repName: getPublicRepName(data.repName),
  }

  return [
    `window.AMETHYST_RUNTIME_CONTEXT = ${safeScriptJson(publicRuntimeContext)};`,
    buildPublicSiteVisibilityScript(publicData.visibility),
    `window.AMETHYST_PANTRY_TEMPLATE_DATA = ${safeScriptJson(publicData)};`,
  ].join('\n')
}
