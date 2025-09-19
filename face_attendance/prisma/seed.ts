// prisma/seed.ts
import { dbUtils } from '../lib/database'

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    await dbUtils.seedDatabase()
    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })