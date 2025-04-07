const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function updateUserSchema() {
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
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users in the database`);
    
    // Define additional fields for user profile
    const additionalFields = {
      bio: "I'm a movie enthusiast who loves to share my thoughts on films.",
      location: "New York, USA",
      website: "https://example.com",
      social: {
        twitter: "twitterhandle",
        instagram: "instagramhandle",
        facebook: "facebookhandle"
      },
      preferences: {
        favoriteGenres: ["Action", "Drama", "Sci-Fi"],
        language: "English",
        notifications: true
      },
      stats: {
        reviewsCount: 0,
        favoritesCount: 0,
        watchlistCount: 0,
        viewsCount: 0,
        likesReceived: 0,
        followersCount: 0,
        followingCount: 0
      },
      joinDate: new Date(),
      lastActive: new Date(),
      isVerified: true,
      cover: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=1200&h=400&fit=crop",
      followers: [],
      following: []
    };

    // Update each user
    let updatedCount = 0;
    for (const user of users) {
      // Calculate real stats based on existing user data
      const stats = {
        reviewsCount: 0,
        favoritesCount: Array.isArray(user.favorites) ? user.favorites.length : 0,
        watchlistCount: Array.isArray(user.watchlist) ? user.watchlist.length : 0,
        viewsCount: 0,
        likesReceived: 0, 
        followersCount: 0,
        followingCount: 0
      };

      // Prepare the update object
      const updateData = {
        ...additionalFields,
        stats,
        // Use creation date for join date if available, otherwise current date
        joinDate: user.createdAt || new Date(),
        // Set last active to now
        lastActive: new Date()
      };

      // Set default collections if they don't exist
      if (!Array.isArray(user.favorites)) updateData.favorites = [];
      if (!Array.isArray(user.watchlist)) updateData.watchlist = [];
      if (!Array.isArray(user.followers)) updateData.followers = [];
      if (!Array.isArray(user.following)) updateData.following = [];

      // Update user document
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} users with new profile fields`);

    // Calculate real stats by querying related collections
    console.log('Updating user stats with actual counts from related collections...');
    
    // Get reviews collection
    const reviewsCollection = await db.collection('reviews');
    
    // Loop through users again to update stats with real counts
    for (const user of users) {
      // Count reviews
      const reviewsCount = await reviewsCollection.countDocuments({ 
        user: new ObjectId(user._id) 
      });

      // Count likes received
      const userReviews = await reviewsCollection.find({ 
        user: new ObjectId(user._id) 
      }).toArray();
      
      let likesReceived = 0;
      userReviews.forEach(review => {
        likesReceived += Array.isArray(review.likes) ? review.likes.length : 0;
      });

      // Update user with real stats
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            "stats.reviewsCount": reviewsCount,
            "stats.likesReceived": likesReceived
          } 
        }
      );
      
      console.log(`Updated stats for user ${user.username || user.email}:`);
      console.log(`- Reviews: ${reviewsCount}`);
      console.log(`- Likes received: ${likesReceived}`);
      console.log(`- Favorites: ${Array.isArray(user.favorites) ? user.favorites.length : 0}`);
      console.log(`- Watchlist: ${Array.isArray(user.watchlist) ? user.watchlist.length : 0}`);
    }

    console.log('User schema update complete!');
  } catch (error) {
    console.error('Error updating user schema:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the update function
updateUserSchema(); 