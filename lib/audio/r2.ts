import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!

export function buildR2Key(artistId: string, trackId: string, ext: string) {
  return `tracks/${artistId}/${trackId}.${ext}`
}

export function buildCoverR2Key(artistId: string, trackId: string, ext: string) {
  return `covers/${artistId}/${trackId}.${ext}`
}

export function buildAlbumCoverR2Key(artistId: string, albumId: string, ext: string) {
  return `album-covers/${artistId}/${albumId}.${ext}`
}

/** アップロード用署名付きURL（5分有効） */
export async function getUploadUrl(key: string, contentType: string, contentLength: number) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // Content-Length becomes a signed header. R2 rejects a body with a
    // different size, preventing a presigned URL from being used for an
    // unbounded upload.
    ContentLength: contentLength,
  })
  return getSignedUrl(r2, cmd, { expiresIn: 300 })
}

/** 再生用署名付きURL（1時間有効） */
export async function getStreamUrl(key: string) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(r2, cmd, { expiresIn: 3600 })
}

/**
 * R2 の音声をサーバーから中継する。署名付き URL をブラウザへ渡さないため、
 * URL 単体をコピーしての取得を防げる。
 */
export async function getStreamObject(key: string, range?: string) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(range ? { Range: range } : {}),
  })
  return r2.send(cmd)
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/flac': 'flac',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
}

export function getAudioExt(contentType: string): string | null {
  return ALLOWED_AUDIO_TYPES[contentType] ?? null
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function getImageExt(contentType: string): string | null {
  return ALLOWED_IMAGE_TYPES[contentType] ?? null
}
