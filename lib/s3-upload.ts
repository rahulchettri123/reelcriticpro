import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_A_KEY_ID || '',
    secretAccessKey: process.env.AWS_S_ACCESS_KEY || '',
  },
});

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'reelcritic';
    const key = `profile-pictures/${Date.now()}-${fileName}`;

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(params));
    
    // Construct the URL to the uploaded file
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
} 