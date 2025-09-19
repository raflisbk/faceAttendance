// import { PrismaClient } from '@prisma/client'
import { db } from './database'

// Re-export the database client as prisma for compatibility
export const prisma = db

export default prisma