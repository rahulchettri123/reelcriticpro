import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { uploadToS3 } from '@/lib/s3-upload';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      const decoded = jwt.verify(token.value, jwtSecret) as { id: string };
      const userId = decoded.id;
      
      // Parse the form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Check file type
      const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validFileTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' 
        }, { status: 400 });
      }
      
      // Check file size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: 'File too large. Maximum size is 5MB.' 
        }, { status: 400 });
      }
      
      try {
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Upload to S3
        const fileName = file.name.replace(/\s+/g, '-').toLowerCase();
        const imageUrl = await uploadToS3(buffer, fileName, file.type);
        
        // Update user profile with new avatar URL
        const usersCollection = await getCollection('users');
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $set: { 
              avatar: imageUrl,
              updatedAt: new Date()
            } 
          }
        );
        
        // Get updated user
        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
        
        // Remove sensitive data
        const { password, ...userWithoutPassword } = updatedUser;
        
        return NextResponse.json({
          success: true,
          message: 'Profile picture uploaded successfully',
          imageUrl,
          user: userWithoutPassword
        });
      } catch (uploadError) {
        console.error('Error during file processing or upload:', uploadError);
        return NextResponse.json({ 
          error: uploadError instanceof Error ? uploadError.message : 'Failed to upload file. Please try again.' 
        }, { status: 500 });
      }
      
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to upload file. Please try again.' 
    }, { status: 500 });
  }
} 