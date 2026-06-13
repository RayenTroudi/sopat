import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

export function generateSignedUploadParams(folder: string) {
  const timestamp = Math.round(Date.now() / 1000)
  const paramsToSign = { folder, timestamp }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!)
  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
  }
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  opts: { folder: string; publicId?: string; format?: 'pdf' | 'jpg' | 'png' },
): Promise<{ publicId: string; url: string; secureUrl: string; bytes: number; format: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: opts.folder, public_id: opts.publicId, format: opts.format ?? 'pdf' },
      (err, res) => {
        if (err || !res) return reject(err ?? new Error('Cloudinary upload returned no result'))
        resolve({
          publicId: res.public_id,
          url: res.url,
          secureUrl: res.secure_url,
          bytes: res.bytes,
          format: res.format,
        })
      },
    )
    stream.end(buffer)
  })
}
