/**
 * Script to clean duplicate application numbers from database
 * Run this if you encounter duplicate key errors
 * 
 * Usage: node server/scripts/cleanDuplicateApplications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const OnlineAdmission = require('../model/studentInformation/onlineAdmission.model');

async function cleanDuplicates() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to database');

    // Find all applications with duplicate applicationNo
    const duplicates = await OnlineAdmission.aggregate([
      {
        $group: {
          _id: '$applicationNo',
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Found ${duplicates.length} duplicate application numbers`);

    // For each duplicate, keep the first one and delete the rest
    for (const dup of duplicates) {
      const [keepId, ...deleteIds] = dup.docs;
      
      console.log(`Keeping ${keepId}, deleting ${deleteIds.length} duplicates for applicationNo: ${dup._id}`);
      
      await OnlineAdmission.deleteMany({
        _id: { $in: deleteIds }
      });
    }

    // Reset all applicationNo to null for regeneration (optional)
    // Uncomment if you want to regenerate all application numbers
    // await OnlineAdmission.updateMany({}, { $unset: { applicationNo: 1 } });
    // console.log('Reset all application numbers');

    console.log('Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    process.exit(1);
  }
}

cleanDuplicates();
