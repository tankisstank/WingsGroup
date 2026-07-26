import 'dotenv/config'

import { seedPhase1LaunchSmoke } from '../tests/helpers/seedPhase1Launch'

try {
  await seedPhase1LaunchSmoke()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
