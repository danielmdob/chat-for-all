import S3 from 'aws-sdk/clients/s3'

export interface SignedPostRequest {
  key: string
  contentType: string
  fileSizeBytes: number
}

const bucketName = 'chat-for-all-media'

export function getSignedRequest(request: SignedPostRequest): string {
  return new S3({ useAccelerateEndpoint: true, signatureVersion: 'v4' }).getSignedUrl('putObject', {
    ACL: 'public-read',
    Bucket: bucketName,
    Key: request.key,
    Expires: 600,
  })
}

export function deleteObject(objectKey: string): void {
  new S3({ signatureVersion: 'v4' }).deleteObject(
    {
      Bucket: bucketName,
      Key: objectKey,
    },
    (err) => {
      console.error('err', err)
    },
  )
}
