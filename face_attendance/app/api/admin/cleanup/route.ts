import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🌤️ Starting Cloudinary cleanup...')

    const foldersToClean = [
      'face-attendance/student-id',
      'face-attendance/face-enrollment',
      'face-attendance/test'
    ]

    let totalDeleted = 0

    for (const folder of foldersToClean) {
      try {
        console.log(`🗂️ Cleaning folder: ${folder}`)

        // Get all resources in folder
        const resources = await cloudinary.api.resources({
          type: 'upload',
          prefix: folder,
          max_results: 500
        })

        if (resources.resources.length === 0) {
          console.log(`   ✅ Folder ${folder} is already empty`)
          continue
        }

        console.log(`   📄 Found ${resources.resources.length} files in ${folder}`)

        // Delete all resources in batches
        const publicIds = resources.resources.map((resource: any) => resource.public_id)

        if (publicIds.length > 0) {
          const deleteResult = await cloudinary.api.delete_resources(publicIds)
          const deletedCount = Object.keys(deleteResult.deleted).length
          totalDeleted += deletedCount
          console.log(`   🗑️ Deleted ${deletedCount} files from ${folder}`)
        }

        // Try to delete the folder itself (will only work if empty)
        try {
          await cloudinary.api.delete_folder(folder)
          console.log(`   📁 Deleted folder: ${folder}`)
        } catch (folderError) {
          console.log(`   ⚠️ Could not delete folder ${folder} (may not be empty)`)
        }

      } catch (error) {
        console.error(`   ❌ Error cleaning folder ${folder}:`, error)
      }
    }

    // Also clean any loose files in face-attendance root
    try {
      console.log('🗂️ Cleaning face-attendance root folder...')
      const rootResources = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'face-attendance',
        max_results: 500
      })

      if (rootResources.resources.length > 0) {
        const rootPublicIds = rootResources.resources
          .filter((resource: any) => !resource.public_id.includes('/'))
          .map((resource: any) => resource.public_id)

        if (rootPublicIds.length > 0) {
          const deleteResult = await cloudinary.api.delete_resources(rootPublicIds)
          const deletedCount = Object.keys(deleteResult.deleted).length
          totalDeleted += deletedCount
          console.log(`   🗑️ Deleted ${deletedCount} files from root`)
        }
      }
    } catch (error) {
      console.error('   ❌ Error cleaning root folder:', error)
    }

    console.log('✅ Cloudinary cleanup completed!')

    return NextResponse.json({
      success: true,
      message: 'Cloudinary cleanup completed successfully',
      totalDeleted
    })

  } catch (error) {
    console.error('❌ Error during Cloudinary cleanup:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup Cloudinary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}