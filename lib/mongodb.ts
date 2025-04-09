import { MongoClient, ServerApiVersion } from "mongodb"

// Replace with your MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/movie-critics"

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = client.connect()
}

export default clientPromise

// Helper function to get the database
export async function getDatabase() {
  const client = await clientPromise
  return client.db()
}

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  const db = await getDatabase()
  return db.collection(collectionName)
}

