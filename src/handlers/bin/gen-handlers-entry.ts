// generate a stub file for each `handlers/*.ts`

import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

try {
  const files = await readdir('./build/handlers')
  for (const file of files) {
    if (file.endsWith('.js')) {
      console.log(new Date(), 'gen entry:', file)
      const base = path.basename(file, '.js')
      await writeFile(file, `export * from "#handlers/${base}.js";`)
    }
  }
} catch (err) {
  console.error(err)
}
