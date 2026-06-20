import type { Payload, PayloadRequest } from 'payload'

export const localAdminCredentials = {
  email: 'local-admin@wingsgroup.test',
  name: 'Local Admin',
  password: 'test',
  role: 'super-admin',
} as const

const seedContext = {
  disableRevalidate: true,
  seed: true,
}

export const ensureLocalAdminUser = async (payload: Payload, req?: PayloadRequest) => {
  const existing = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      email: {
        equals: localAdminCredentials.email,
      },
    },
  })

  const userData = {
    email: localAdminCredentials.email,
    name: localAdminCredentials.name,
    password: localAdminCredentials.password,
    role: localAdminCredentials.role,
    sites: [],
  }

  if (existing.docs[0]) {
    return payload.update({
      collection: 'users',
      context: seedContext,
      data: userData,
      id: existing.docs[0].id,
      overrideAccess: true,
      req,
    })
  }

  return payload.create({
    collection: 'users',
    context: seedContext,
    data: userData,
    overrideAccess: true,
    req,
  })
}
