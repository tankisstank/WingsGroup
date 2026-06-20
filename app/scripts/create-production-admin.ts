import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.')
}

const payload = await getPayload({ config })
const existing = await payload.find({
  collection: 'users',
  depth: 0,
  limit: 1,
  where: {
    email: {
      equals: email,
    },
  },
})

if (!existing.docs[0]) {
  await payload.create({
    collection: 'users',
    data: {
      email,
      name: 'WingsGroup Administrator',
      password,
      role: 'super-admin',
      sites: [],
    },
  })
}

payload.logger.info(`Production administrator ready: ${email}`)
process.exit(0)
