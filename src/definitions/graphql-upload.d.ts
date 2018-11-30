declare module 'graphql-upload' {
  import { ReadStream } from 'fs'
  import { Request, Response, NextFunction } from 'express'
  type FileUpload = Promise<{
    filename: string
    mimetype: string
    encoding: string
    createReadStream: () => ReadStream
  }>

  type UploadOptions = {
    maxFieldSize?: number
    maxFileSize?: number
    maxFiles?: number
  }
}
