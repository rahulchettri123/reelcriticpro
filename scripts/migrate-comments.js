// Migrate comments to support nested replies
// Run with: node scripts/migrate-comments.js

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function migrateComments() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/movie-critics";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const reviewsCollection = db.collection('reviews');

    // Get all reviews with comments
    const reviews = await reviewsCollection.find({ 
      comments: { $exists: true, $ne: [] } 
    }).toArray();

    console.log(`Found ${reviews.length} reviews with comments`);

    let updatedCount = 0;

    // Process each review
    for (const review of reviews) {
      // Check if comments need migration (don't have the new structure)
      const needsMigration = review.comments.some(comment => 
        !comment.hasOwnProperty('replies') || 
        !comment.hasOwnProperty('parentId')
      );

      if (needsMigration) {
        // Update each comment to have the new fields
        const updatedComments = review.comments.map(comment => {
          const commentId = comment._id;
          
          // Convert string IDs to ObjectId if needed
          if (typeof commentId === 'string') {
            comment._id = new ObjectId(commentId);
          }
          
          // Add new fields if they don't exist
          if (!comment.hasOwnProperty('parentId')) {
            comment.parentId = null;
          }
          
          if (!comment.hasOwnProperty('replies')) {
            comment.replies = [];
          }
          
          if (!comment.hasOwnProperty('likes')) {
            comment.likes = [];
          }
          
          if (!comment.hasOwnProperty('updatedAt')) {
            comment.updatedAt = comment.createdAt || new Date();
          }
          
          return comment;
        });

        // Update the review with the updated comments
        await reviewsCollection.updateOne(
          { _id: review._id },
          { $set: { comments: updatedComments } }
        );
        
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} reviews`);
  } catch (error) {
    console.error('Error migrating comments:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

migrateComments().catch(console.error); 