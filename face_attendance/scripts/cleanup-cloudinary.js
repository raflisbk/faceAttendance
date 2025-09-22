const { v2: cloudinary } = require('cloudinary')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function cleanupCloudinary() {
  try {
    console.log('🌤️ Starting Cloudinary cleanup...')

    const foldersToClean = [
      'face-attendance/student-id',
      'face-attendance/face-enrollment',
      'face-attendance/test'
    ]

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
        const publicIds = resources.resources.map(resource => resource.public_id)

        if (publicIds.length > 0) {
          const deleteResult = await cloudinary.api.delete_resources(publicIds)
          console.log(`   🗑️ Deleted ${Object.keys(deleteResult.deleted).length} files from ${folder}`)
        }

        // Try to delete the folder itself (will only work if empty)
        try {
          await cloudinary.api.delete_folder(folder)
          console.log(`   📁 Deleted folder: ${folder}`)
        } catch (folderError) {
          console.log(`   ⚠️ Could not delete folder ${folder} (may not be empty)`)
        }

      } catch (error) {
        console.error(`   ❌ Error cleaning folder ${folder}:`, error.message)
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
          .filter(resource => !resource.public_id.includes('/'))
          .map(resource => resource.public_id)

        if (rootPublicIds.length > 0) {
          await cloudinary.api.delete_resources(rootPublicIds)
          console.log(`   🗑️ Deleted ${rootPublicIds.length} files from root`)
        }
      }
    } catch (error) {
      console.error('   ❌ Error cleaning root folder:', error.message)
    }

    console.log('✅ Cloudinary cleanup completed!')

  } catch (error) {
    console.error('❌ Error during Cloudinary cleanup:', error)
  }
}

// Check if Cloudinary is configured
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.log('⚠️ Cloudinary not configured. Skipping Cloudinary cleanup.')
  console.log('Environment variables needed:')
  console.log('- CLOUDINARY_CLOUD_NAME')
  console.log('- CLOUDINARY_API_KEY')
  console.log('- CLOUDINARY_API_SECRET')
} else {
  cleanupCloudinary()
}