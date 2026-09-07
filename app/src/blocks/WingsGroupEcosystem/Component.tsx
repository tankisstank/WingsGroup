import type { WingsGroupEcosystemBlock } from '@/payload-types'
import { EcosystemExplorer } from '@/components/WingsGroupV3/EcosystemExplorer'

export const WingsGroupEcosystemComponent = (
  props: WingsGroupEcosystemBlock & {
    approvedProofKeys?: readonly string[]
    locale?: null | string
  },
) => <EcosystemExplorer {...props} />
