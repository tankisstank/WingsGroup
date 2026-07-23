const disabledSeedResponse = () => new Response('Not found.', { status: 404 })

// Destructive database seeding is intentionally unavailable over HTTP. Local
// tooling may import the guarded seed function directly after explicit opt-in.
export const GET = disabledSeedResponse
export const POST = disabledSeedResponse
