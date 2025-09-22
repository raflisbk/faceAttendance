const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...')

    // Delete in correct order to avoid foreign key constraints
    console.log('Deleting registration steps...')
    await prisma.registrationStep.deleteMany({})

    console.log('Deleting documents...')
    await prisma.document.deleteMany({})

    console.log('Deleting face profiles...')
    await prisma.faceProfile.deleteMany({})

    console.log('Deleting face quality logs...')
    await prisma.faceQualityLog.deleteMany({})

    console.log('Deleting audit logs...')
    await prisma.auditLog.deleteMany({})

    console.log('Deleting user approvals...')
    await prisma.userApproval.deleteMany({})

    console.log('Deleting document verifications...')
    await prisma.documentVerification.deleteMany({})

    console.log('Deleting enrollments...')
    await prisma.enrollment.deleteMany({})

    console.log('Deleting attendances...')
    await prisma.attendance.deleteMany({})

    console.log('Deleting sessions...')
    await prisma.session.deleteMany({})

    console.log('Deleting accounts...')
    await prisma.account.deleteMany({})

    console.log('Deleting OTPs...')
    await prisma.oTP.deleteMany({})

    console.log('Deleting users...')
    const deletedUsers = await prisma.user.deleteMany({})

    console.log(`✅ Database cleanup completed!`)
    console.log(`📊 Deleted ${deletedUsers.count} users and all related data`)

  } catch (error) {
    console.error('❌ Error during database cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDatabase()