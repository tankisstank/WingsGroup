export const phase1LandingPageRequiredBlocks = ['content', 'mediaBlock', 'cta', 'formBlock'] as const

export type Phase1LandingPageRequiredBlock = (typeof phase1LandingPageRequiredBlocks)[number]

export type LandingPageBlockLike = {
  blockType?: null | string
}

export const getMissingPhase1LandingPageBlocks = (
  blocks: LandingPageBlockLike[] | null | undefined,
): Phase1LandingPageRequiredBlock[] => {
  const availableBlocks = new Set((blocks || []).map((block) => block.blockType).filter(Boolean))

  return phase1LandingPageRequiredBlocks.filter((blockType) => !availableBlocks.has(blockType))
}

export const isPhase1LandingPagePattern = (blocks: LandingPageBlockLike[] | null | undefined) =>
  getMissingPhase1LandingPageBlocks(blocks).length === 0
