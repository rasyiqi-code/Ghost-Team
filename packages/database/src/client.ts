import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const db = prisma.$extends({})

export type Db = typeof db
