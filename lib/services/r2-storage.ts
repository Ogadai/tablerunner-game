import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2UploadOptions {
  bucket?: string;
  contentType?: string;
}

export interface R2PresignedUrlOptions {
  bucket?: string;
  expiresIn?: number;
}

export interface R2DownloadOptions {
  bucket?: string;
}

export interface R2StorageItem {
  pathname: string;
  uploadedAt: Date;
  size?: number;
  etag?: string;
}

export interface R2ListOptions {
  bucket?: string;
  maxPages?: number;
}

/**
 * Returns an S3Client configured for Cloudflare R2.
 * Region is hardcoded to 'auto'.
 * Endpoint is https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com
 */
export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Constructs the final public URL for an R2 object using LOCATION_IMAGE_BASE_URL.
 */
export function constructR2PublicUrl(key: string): string {
  const baseUrl = (process.env.LOCATION_IMAGE_BASE_URL || '').replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return baseUrl ? `${baseUrl}/${cleanKey}` : cleanKey;
}

/**
 * Uploads a file/buffer to Cloudflare R2 using the S3 API (PutObjectCommand).
 * Uses R2_PUBLIC_BUCKET_NAME for bucket by default and constructs final URL with LOCATION_IMAGE_BASE_URL.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  options?: R2UploadOptions
): Promise<{ url: string; key: string }> {
  const client = getR2Client();
  const bucket = options?.bucket || process.env.R2_PUBLIC_BUCKET_NAME;

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
  };

  if (options?.contentType) {
    params.ContentType = options.contentType;
  }

  await client.send(new PutObjectCommand(params));

  const url = constructR2PublicUrl(key);
  return { url, key };
}

/**
 * Generates a presigned download URL for an R2 object using @aws-sdk/s3-request-presigner.
 */
export async function getR2DownloadUrl(
  key: string,
  options?: R2PresignedUrlOptions
): Promise<string> {
  const client = getR2Client();
  const bucket = options?.bucket || process.env.R2_PUBLIC_BUCKET_NAME;
  const expiresIn = options?.expiresIn ?? 3600;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Downloads an object directly from R2 using GetObjectCommand.
 */
export async function downloadFromR2(
  key: string,
  options?: R2DownloadOptions
): Promise<Buffer> {
  const client = getR2Client();
  const bucket = options?.bucket || process.env.R2_PUBLIC_BUCKET_NAME;

  const params: GetObjectCommandInput = {
    Bucket: bucket,
    Key: key,
  };

  const response = await client.send(new GetObjectCommand(params));
  if (!response.Body) {
    throw new Error(`Empty response body for object: ${key}`);
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Checks if an object exists in R2 using HeadObjectCommand.
 */
export async function checkR2ObjectExists(
  key: string,
  options?: { bucket?: string }
): Promise<boolean> {
  const client = getR2Client();
  const bucket = options?.bucket || process.env.R2_PUBLIC_BUCKET_NAME;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Lists objects from Cloudflare R2 under a given prefix using ListObjectsV2Command.
 * Includes loop protection (seen continuation tokens and a max pages limit) to prevent runaway calls.
 */
export async function listObjectsFromR2(
  prefix: string,
  options?: R2ListOptions
): Promise<R2StorageItem[]> {
  const client = getR2Client();
  const bucket = options?.bucket || process.env.R2_PUBLIC_BUCKET_NAME;
  const maxPages = options?.maxPages ?? 100;

  const items: R2StorageItem[] = [];
  let continuationToken: string | undefined;
  let pageCount = 0;
  const seenTokens = new Set<string>();

  do {
    const params: ListObjectsV2CommandInput = {
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    };

    const response = await client.send(new ListObjectsV2Command(params));

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          items.push({
            pathname: object.Key,
            uploadedAt: object.LastModified ?? new Date(),
            size: object.Size,
            etag: object.ETag,
          });
        }
      }
    }

    pageCount++;
    if (pageCount >= maxPages) {
      console.warn(`Reached maximum page limit (${maxPages}) while listing objects for prefix ${prefix}`);
      break;
    }

    const nextToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    if (nextToken && seenTokens.has(nextToken)) {
      console.warn(`Detected loop in continuation token while listing objects for prefix ${prefix}`);
      break;
    }
    if (nextToken) {
      seenTokens.add(nextToken);
    }
    continuationToken = nextToken;
  } while (continuationToken);

  return items;
}
