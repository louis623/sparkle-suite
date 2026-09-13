import { tool } from 'ai'
import { z } from 'zod'
import {
  completeRequiredSetupStep,
  saveRequiredSetupAnswer,
} from '@/lib/self-serve/required-setup'
import type { ToolDefinition } from './types'

const requiredSetupStepSchema = z.enum([
  'account_basics',
  'site_skin',
  'welcome_copy',
  'about_page',
  'show_schedule',
  'customer_site_orientation',
  'live_queue_setup',
  'trade_board_orientation',
  'final_preview_approval',
])

const inputSchema = z.object({
  stepId: requiredSetupStepSchema,
  answer: z.record(z.string(), z.unknown()),
  generatedCopy: z.record(z.string(), z.unknown()).optional(),
  supportState: z.record(z.string(), z.unknown()).optional(),
  completeStep: z.boolean().optional(),
})

export const saveRequiredSetupAnswerTool: ToolDefinition = {
  name: 'save_required_setup_answer',
  readOnly: false,
  build: (ctx) =>
    tool({
      description:
        'Save a required setup answer and optionally mark that setup step complete. Live Queue completion is verified by the server, not checklist claims. Never send publisher keys; use an empty answer for Live Queue.',
      inputSchema,
      execute: async (input) => {
        validateCompletion(input)
        if (input.stepId === 'live_queue_setup') {
          return input.completeStep
            ? completeRequiredSetupStep(ctx.repId, input.stepId)
            : saveRequiredSetupAnswer(ctx.repId, input.stepId, {})
        }
        const options = {
          ...(input.generatedCopy
            ? { generatedCopyPatch: input.generatedCopy }
            : {}),
          ...(input.supportState
            ? { supportStatePatch: input.supportState }
            : {}),
        }
        const saved = await saveRequiredSetupAnswer(
          ctx.repId,
          input.stepId,
          input.answer,
          options,
        )

        if (!input.completeStep) return saved
        validateSavedCompletion(input, saved)
        return completeRequiredSetupStep(ctx.repId, input.stepId)
      },
    }),
}

function validateCompletion(input: z.infer<typeof inputSchema>) {
  if (!input.completeStep) return

  if (input.stepId === 'account_basics') {
    if (input.answer.accountBasicsConfirmed !== true) {
      throw new Error(
        'The account basics summary must be confirmed before completing account basics.',
      )
    }
  }

}

function validateSavedCompletion(
  input: z.infer<typeof inputSchema>,
  saved: unknown,
) {
  if (input.stepId !== 'account_basics') return

  const accountBasics =
    saved &&
    typeof saved === 'object' &&
    'answers' in saved &&
    saved.answers &&
    typeof saved.answers === 'object' &&
    'account_basics' in saved.answers &&
    saved.answers.account_basics &&
    typeof saved.answers.account_basics === 'object'
      ? saved.answers.account_basics
      : null

  if (
    !accountBasics ||
    !('publicSiteSlugStatus' in accountBasics) ||
    accountBasics.publicSiteSlugStatus !== 'accepted'
  ) {
    throw new Error(
      'The Sparkle Suite show link must be accepted before completing account basics.',
    )
  }
}
