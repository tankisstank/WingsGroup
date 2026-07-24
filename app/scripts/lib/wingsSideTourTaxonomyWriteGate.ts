import { assertWingsSideReleaseWriteGuard } from './wingsSideReleaseWriteGuard'
import { wingsSideTourTaxonomyMappingRevision } from './wingsSideTourTaxonomy'

export type TourTaxonomyMode = 'apply' | 'dry-run' | 'rollback'

export type TourTaxonomyCLIArgs = {
  adminEmail?: string
  backupPath?: string
  backupSha256?: string
  editorialApproval?: string
  outputPath?: string
  planPath?: string
  production: boolean
  productionConfirm?: string
  releaseSha?: string
  rollbackRelease?: string
}

type ReleaseEnvironment = Partial<Record<string, string | undefined>>

const argumentValue = (argv: string[], name: string) => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export const parseTourTaxonomyCLIArgs = (argv: string[]): TourTaxonomyCLIArgs => ({
  adminEmail: argumentValue(argv, '--admin-email'),
  backupPath: argumentValue(argv, '--backup'),
  backupSha256: argumentValue(argv, '--backup-sha256'),
  editorialApproval: argumentValue(argv, '--editorial-approval'),
  outputPath: argumentValue(argv, '--output'),
  planPath: argumentValue(argv, '--plan'),
  production: argv.includes('--production'),
  productionConfirm: argumentValue(argv, '--confirm-production'),
  releaseSha: argumentValue(argv, '--release-sha'),
  rollbackRelease: argumentValue(argv, '--rollback-release'),
})

export const assertTourTaxonomyWriteGate = ({
  args,
  env = process.env,
  mode,
}: {
  args: TourTaxonomyCLIArgs
  env?: ReleaseEnvironment
  mode: TourTaxonomyMode
}) => {
  if (mode === 'dry-run') {
    return { environment: 'dry-run' as const, productionMutation: false }
  }
  if (args.editorialApproval !== wingsSideTourTaxonomyMappingRevision) {
    throw new Error(
      `Apply/rollback requires --editorial-approval ${wingsSideTourTaxonomyMappingRevision}`,
    )
  }

  const databaseURL = env.DATABASE_URL || ''
  const postgres = /^postgres(?:ql)?:\/\//i.test(databaseURL)
  const productionMarkers =
    env.NODE_ENV === 'production' || Boolean(env.VERCEL) || Boolean(env.RAILWAY_ENVIRONMENT)

  if (postgres || productionMarkers) {
    assertWingsSideReleaseWriteGuard(
      {
        backupPath: args.backupPath,
        backupSha256: args.backupSha256,
        production: args.production,
        productionConfirm: args.productionConfirm,
        releaseSha: args.releaseSha,
        rollbackRelease: args.rollbackRelease,
      },
      env,
    )
    const production = env.WINGSSIDE_RELEASE_REMEDIATION_ALLOW === 'production'
    return {
      environment: production ? ('production' as const) : ('postgres-clone' as const),
      productionMutation: production,
    }
  }

  if (args.production) {
    throw new Error('Write blocked: --production cannot target local SQLite')
  }
  if (databaseURL && !/^file:/i.test(databaseURL)) {
    throw new Error('Write blocked: local taxonomy writes require a file: SQLite URL')
  }
  return { environment: 'local-sqlite' as const, productionMutation: false }
}
