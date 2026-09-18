import path from 'node:path'

export const DEFAULT_DATABASE_PORT = '5432'
export const DATABASE_USER = 'postgres'
export const DATABASE_PASSWORD = 'postgres'

export type DatabaseConfig = {
  databasePort: string
  databaseName: string
  databaseUrl: string
}

export function defaultDatabaseName(projectName: string, cwd: string) {
  const raw = projectName.trim() === '.' ? path.basename(cwd) : projectName.trim()
  return raw || 'fullest_app'
}

export function buildDatabaseUrl(port: string, name: string) {
  return `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:${port}/${name}?schema=public`
}

export function createDatabaseConfig(port: string, name: string): DatabaseConfig {
  const databasePort = port.trim() || DEFAULT_DATABASE_PORT
  const databaseName = name.trim()
  return {
    databasePort,
    databaseName,
    databaseUrl: buildDatabaseUrl(databasePort, databaseName),
  }
}

export function invalidDatabasePort(value: string) {
  const port = Number(value.trim() || DEFAULT_DATABASE_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 'Enter a port between 1 and 65535'
  }
}

export function invalidDatabaseName(value: string) {
  const name = value.trim()
  if (!name) return 'A database name is required'
  if (/[/\\?#\s@:]/.test(name)) {
    return 'Use a name without spaces or URL characters'
  }
}
