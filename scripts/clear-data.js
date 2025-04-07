const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearDatabaseData() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set!');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db();
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in the database`);

    // Collections to retain all data (adjust as needed)
    const retainFullCollections = ['users'];
    
    // Collections to partially clear (keep schema/indices but clear data)
    const clearCollections = ['movies', 'reviews', 'favorites', 'watchlist'];
    
    // Process collections
    for (const collection of collections) {
      const collectionName = collection.name;
      
      if (clearCollections.includes(collectionName)) {
        console.log(`Clearing all documents from collection: ${collectionName}`);
        const deleteResult = await db.collection(collectionName).deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} documents from ${collectionName}`);
      } else if (!retainFullCollections.includes(collectionName)) {
        console.log(`Warning: Unhandled collection: ${collectionName} - no action taken`);
      } else {
        console.log(`Keeping all data in collection: ${collectionName}`);
      }
    }

    console.log('Database clear operation complete!');
    console.log('- Retained full collections:', retainFullCollections);
    console.log('- Cleared collections (structure retained):', clearCollections);
  } catch (error) {
    console.error('Error clearing database data:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the clear data function
clearDatabaseData(); 