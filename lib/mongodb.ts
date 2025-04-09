import { MongoClient, Db, Collection } from "mongodb"

// Check for mongodb URI in environment variables
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env")
}

// Connection caching
interface CachedConnection {
  client: MongoClient
  db: Db
  collections: { [key: string]: Collection }
}

let cached: CachedConnection | null = null

// Helper to validate collection name
function isValidCollectionName(name: string): boolean {
  // Simple validation to prevent injection attacks
  return /^[a-zA-Z0-9_-]+$/.test(name)
}

/**
 * Get a MongoDB connection
 * @returns {Promise<Db>}
 */
export async function getMongoDb(): Promise<Db> {
  // If we have a cached connection, return it
  if (cached && cached.db) {
    return cached.db
  }

  // Otherwise, create a new connection
  try {
    // Connect to MongoDB
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    }

    const client = await MongoClient.connect(MONGODB_URI!, opts)
    const db = client.db()

    // Cache the connection
    cached = {
      client,
      db,
      collections: {},
    }

    console.log("Connected to MongoDB")
    return db
  } catch (error) {
    console.error("Error connecting to MongoDB:", error)
    throw new Error("Failed to connect to database")
  }
}

/**
 * Get a collection from the database
 * @param {string} collectionName - The name of the collection
 * @returns {Promise<Collection>}
 */
export async function getCollection(collectionName: string): Promise<Collection> {
  // Validate collection name
  if (!isValidCollectionName(collectionName)) {
    throw new Error(`Invalid collection name: ${collectionName}`)
  }

  // Check cache first
  if (cached && cached.collections[collectionName]) {
    return cached.collections[collectionName]
  }

  // Get the database connection
  const db = await getMongoDb()
  
  // Get the collection
  try {
    const collection = db.collection(collectionName)
    
    // Cache the collection
    if (cached) {
      cached.collections[collectionName] = collection
    }
    
    return collection
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error)
    throw new Error(`Failed to get collection: ${collectionName}`)
  }
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoConnection(): Promise<void> {
  if (cached && cached.client) {
    await cached.client.close()
    cached = null
    console.log("MongoDB connection closed")
  }
}

// Handle process termination
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await closeMongoConnection()
  })
}

