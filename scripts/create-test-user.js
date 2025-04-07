const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
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
    const usersCollection = db.collection('users');
    
    // Check if test user already exists
    const existingUser = await usersCollection.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists:');
      console.log('- Email: test@example.com');
      console.log('- Username:', existingUser.username);
      console.log('- Role:', existingUser.role);
      console.log('- ID:', existingUser._id);
    } else {
      // Create a new test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        role: 'critic', // or 'viewer' or 'admin'
        favorites: [],
        watchlist: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await usersCollection.insertOne(newUser);
      
      console.log('Test user created successfully:');
      console.log('- Email: test@example.com');
      console.log('- Password: password123');
      console.log('- Role: critic');
      console.log('- ID:', result.insertedId);
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the create user function
createTestUser(); 