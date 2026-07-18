const noStoreHeaders = (requestID: string) => ({
  'Cache-Control': 'no-store',
  'X-Request-ID': requestID,
})

export function GET(): Response {
  const requestID = crypto.randomUUID()

  return Response.json(
    {
      requestId: requestID,
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { headers: noStoreHeaders(requestID) },
  )
}

export const HEAD = GET

