import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://ghost:changeme@localhost:5432/ghost_relay',
  },
})
