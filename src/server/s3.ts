import S3 from 'aws-sdk/clients/s3'

export interface SignedPostRequest {
  key: string
  contentType: string
  fileSizeBytes: number
}

export function getSignedRequest(request: SignedPostRequest): S3.PresignedPost {
  return new S3({ useAccelerateEndpoint: true }).createPresignedPost(getPresignedPostParams(request))
}
function getPresignedPostParams({ key, contentType, fileSizeBytes }: SignedPostRequest): S3.PresignedPost.Params {
  return {
    Bucket: 'chat-for-all-media',
    Fields: {
      key,
      acl: 'public-read',
    },
    Expires: 600, // 10 minutes
    Conditions: [{ 'Content-Type': contentType }, ['content-length-range', 0, fileSizeBytes]],
  }
}
