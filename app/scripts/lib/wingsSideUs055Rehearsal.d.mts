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
export function assertDisposablePostgresTarget(rawURL: string): RehearsalTargetIdentity
export function redactDatabaseURL(rawURL: string): string
export function parseLoopbackDockerPort(value: string): number
export function loadBaselineSource(
  sourcePath: string,
  manifestPath: string,
): Promise<{ sourceDocument: unknown; sourceRaw: string; tours: Array<Record<string, unknown>> }>
export function assertArtifactInputContract(
  input: RehearsalArtifactInput,
): { status: 'pending'; reason: string } | { status: 'supplied' }
