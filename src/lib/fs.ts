import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

export function readText(filePath: string) {
  return readFileSync(filePath, 'utf8')
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T
}

export function writeText(filePath: string, contents: string) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

export function writeJson(filePath: string, value: unknown) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export function exists(filePath: string) {
  return existsSync(filePath)
}

export function readOptional(filePath: string) {
  if (!existsSync(filePath)) return undefined
  return readText(filePath)
}

export function firstExisting(paths: string[]) {
  return paths.find(candidate => existsSync(candidate))
}

export function ensureDir(dirPath: string) {
  mkdirSync(dirPath, { recursive: true })
}

export function movePath(from: string, to: string) {
  if (!existsSync(from) || from === to) return
  mkdirSync(path.dirname(to), { recursive: true })
  if (existsSync(to)) {
    if (statSync(from).isDirectory()) {
      cpSync(from, to, { recursive: true })
      rmSync(from, { recursive: true, force: true })
      return
    }
    writeFileSync(to, readFileSync(from))
    rmSync(from, { force: true })
    return
  }
  renameSync(from, to)
}

export function removeIfEmpty(dirPath: string) {
  if (!existsSync(dirPath)) return
  try {
    rmdirSync(dirPath)
  } catch {
    // Directory still has files; leave it.
  }
}
