export type RehearsalTargetIdentity = {
  database: string
  hostname: string
  port: number
  username: string
}

export type RehearsalArtifactInput = {
  catalogPath?: string
  catalogSha256?: string
  planPath?: string
  planSha256?: string
}

export function sha256(value: string | Buffer): string
export function stableJSONStringify(value: unknown): string
export function canonicalChecksum(value: unknown): string
export function assertDisposablePostgresTarget(rawURL: string): RehearsalTargetIdentity
export function redactDatabaseURL(rawURL: string): string
export function parseLoopbackDockerPort(value: string): number
export function postgresReadinessProbeArgs(input: {
  containerName: string
  database: string
  user: string
}): string[]
export function buildSanitizedChildEnvironment(
  source: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): Record<string, string | undefined>
export function classifyDockerInspectResult(
  result: {
    error?: unknown
    signal?: NodeJS.Signals | null
    status?: number | null
    stderr?: string | Buffer | null
  },
  containerName: string,
): 'absent' | 'present' | 'unverified'
export function loadBaselineSource(
  sourcePath: string,
  manifestPath: string,
): Promise<{ sourceDocument: unknown; sourceRaw: string; tours: Array<Record<string, unknown>> }>
export function buildFrozenSourceProof(tours: Array<Record<string, unknown>>): {
  artifactChecksum: string
  itineraryChecksum: string
  itineraryDays: 116
  serviceChecksum: string
  serviceRows: 331
  tourChecksums: Array<{ checksum: string; slug: string }>
  tours: 22
}
export function loadFrozenSourceSnapshot(snapshotPath: string): Promise<{
  artifactRawSha256: string
  proof: ReturnType<typeof buildFrozenSourceProof>
  snapshot: {
    [key: string]: unknown
    tours: Array<{
      excludes: Array<Record<string, unknown>>
      includes: Array<Record<string, unknown>>
      itineraryDays: Array<Record<string, unknown>>
      slug: string
      summary: string
      title: string
    }>
  }
}>
export function assertArtifactInputContract(
  input: RehearsalArtifactInput,
):
  | { status: 'pending'; reason: string }
  | { status: 'pending'; reason: string; validatedArtifacts: true }
