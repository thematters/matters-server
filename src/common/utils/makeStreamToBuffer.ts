/**
 * Make stream to buffer.
 */
export const makeStreamToBuffer = async (stream: any): Promise<any> => {
  return new Promise((resolve: any, reject: any) => {
    let buffers: any[] = []
    stream.on('error', reject)
    stream.on('data', (data: any) => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })
}
