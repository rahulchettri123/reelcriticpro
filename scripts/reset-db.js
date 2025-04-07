const { MongoClient } = require('mongodb');
require('dotenv').config();

async function resetDatabase() {
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

    // Collections to retain (adjust as needed)
    const retainCollections = ['users'];
    
    // Drop each collection except those in retainCollections
    for (const collection of collections) {
      const collectionName = collection.name;
      
      if (!retainCollections.includes(collectionName)) {
        console.log(`Dropping collection: ${collectionName}`);
        await db.collection(collectionName).drop();
      } else {
        console.log(`Keeping collection: ${collectionName}`);
      }
    }

    console.log('Database reset complete! Kept collections:', retainCollections);
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the reset function
resetDatabase(); 