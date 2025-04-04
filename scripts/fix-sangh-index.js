/**
 * Script to fix the sanghAccessId index issue in the hierarchicalSanghs collection
 * 
 * This script:
 * 1. Drops the unique index on sanghAccessId if it exists
 * 2. Updates any records with undefined sanghAccessId to null
 * 3. Creates a new sparse index on sanghAccessId
 * 
 * Run with: node scripts/fix-sangh-index.js
 */

const { MongoClient } = require('mongodb');

async function fixSanghIndex() {
  // Use the MongoDB connection string from your environment
  const uri = process.env.MONGODB_URI || "mongodb+srv://parthpathakpp1:parthpathak@cluster0.zj2c0.mongodb.net/development";
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db("development");
    const collection = db.collection("hierarchicalsanghs");
    
    // Step 1: Drop the problematic index if it exists
    try {
      await collection.dropIndex("sanghAccessId_1");
      console.log("Successfully dropped index sanghAccessId_1");
    } catch (error) {
      console.log("Index sanghAccessId_1 not found or already dropped:", error.message);
    }
    
    // Step 2: Update any records with undefined sanghAccessId to null
    const updateResult = await collection.updateMany(
      { sanghAccessId: { $exists: false } },
      { $set: { sanghAccessId: null } }
    );
    console.log(`Updated ${updateResult.modifiedCount} records with null sanghAccessId`);
    
    // Step 3: Create a new sparse index on sanghAccessId
    await collection.createIndex({ sanghAccessId: 1 }, { sparse: true });
    console.log("Created new sparse index on sanghAccessId");
    
    console.log("Index fix completed successfully");
  } catch (error) {
    console.error("Error fixing index:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the function
fixSanghIndex().catch(console.error); 