const disabledSeedResponse = () => new Response('Not found.', { status: 404 })

// Destructive database seeding is intentionally unavailable over HTTP.
export const GET = disabledSeedResponse
export const POST = disabledSeedResponse
