const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyCleanup() {
  try {
    console.log('🔍 Verifying database cleanup...')

    // Check all relevant tables
    const tables = [
      'user',
      'registrationStep',
      'document',
      'faceProfile',
      'faceQualityLog',
      'auditLog',
      'userApproval',
      'documentVerification',
      'enrollment',
      'attendance',
      'session',
      'account',
      'oTP'
    ]

    let totalRecords = 0

    for (const table of tables) {
      try {
        const count = await prisma[table].count()
        console.log(`📊 ${table}: ${count} records`)
        totalRecords += count
      } catch (error) {
        console.log(`⚠️ Could not check ${table}: ${error.message}`)
      }
    }

    if (totalRecords === 0) {
      console.log('✅ Database is completely clean!')
      console.log('🎉 All user data has been successfully removed.')
    } else {
      console.log(`⚠️ Found ${totalRecords} records remaining in database`)
      console.log('Some data may still exist in the database.')
    }

    console.log('\n📋 Summary:')
    console.log(`Total records in all tables: ${totalRecords}`)

  } catch (error) {
    console.error('❌ Error during verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyCleanup()