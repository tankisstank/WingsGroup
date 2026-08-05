import 'dotenv/config'

import { seedPhase1LaunchSmoke } from '../tests/helpers/seedPhase1Launch'

try {
  await seedPhase1LaunchSmoke({ destroyPayloadAfterSeed: true })
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
