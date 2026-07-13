import fs from 'fs'

export function writeFileAtomically(filePath: string, data: Uint8Array): void {
  const tempPath = `${filePath}.${process.pid}.tmp`

  try {
    fs.writeFileSync(tempPath, data)
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true })
    }
    throw error
  }
}
