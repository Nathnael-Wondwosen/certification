import { Client, Storage, ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'

function getStorage() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY
  const bucketId = process.env.APPWRITE_BUCKET_ID
  const missing = []
  if (!endpoint) missing.push('APPWRITE_ENDPOINT')
  if (!projectId) missing.push('APPWRITE_PROJECT_ID')
  if (!apiKey) missing.push('APPWRITE_API_KEY')
  if (!bucketId) missing.push('APPWRITE_BUCKET_ID')
  if (missing.length) {
    throw new Error('Missing Appwrite configuration: ' + missing.join(', '))
  }
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey)
  return { storage: new Storage(client), bucketId }
}

export async function uploadFile(buffer, filename) {
  const { storage, bucketId } = getStorage()
  const file = await storage.createFile(
    bucketId,
    ID.unique(),
    InputFile.fromBuffer(buffer, filename || 'upload.bin')
  )
  return file.$id
}

export async function deleteFile(fileId) {
  const { storage, bucketId } = getStorage()
  try {
    await storage.deleteFile(bucketId, fileId)
  } catch (e) {
    // ignore if already deleted
  }
}

export async function downloadFile(fileId) {
  const { storage, bucketId } = getStorage()
  // Returns a Buffer/Uint8Array in Node
  const data = await storage.getFileDownload(bucketId, fileId)
  return data
}

export async function getFileViewURL(fileId) {
  const { storage, bucketId } = getStorage()
  // This returns a Uint8Array as well; prefer download and proxying
  // Keeping for potential future use
  return storage.getFileView(bucketId, fileId)
}
