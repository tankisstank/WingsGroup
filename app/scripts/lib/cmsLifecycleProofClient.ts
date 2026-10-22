import type { HttpFetcher } from './cmsLifecycleProofSafety'

export class CmsHttpClient {
  private token: string | null = null

  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: HttpFetcher = fetch,
  ) {}

  setToken(token: string) {
    this.token = token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T; status: number }> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Origin': this.baseUrl,
      'Cache-Control': 'no-store',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.token) {
      headers.Authorization = `JWT ${this.token}`
      headers.Cookie = `payload-token=${this.token}`
    }

    const response = await this.fetcher(url, { ...options, headers, redirect: 'error' })
    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const errorMsg = data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `HTTP ${response.status} from ${endpoint}`
      const error = new Error(errorMsg) as Error & { status: number; body: unknown }
      error.status = response.status
      error.body = data
      throw error
    }

    return { data: data as T, status: response.status }
  }

  async login(email: string, password: string): Promise<{ adminUserId: number | string; token: string }> {
    const res = await this.request<{
      token?: string
      user?: { id: number | string; role?: string }
    }>('/api/users/login', {
      body: JSON.stringify({ email, password }),
      method: 'POST',
    })

    if (!res.data.token || !res.data.user) {
      throw new Error('Login failed: Missing token or user in auth response')
    }
    if (res.data.user.role !== 'super-admin') {
      throw new Error(`Login rejected: Role "${res.data.user.role}" is not super-admin`)
    }

    this.setToken(res.data.token)
    return { adminUserId: res.data.user.id, token: res.data.token }
  }
}

