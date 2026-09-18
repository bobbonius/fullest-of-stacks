import path from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import { exists, readOptional, writeText } from '../lib/fs.ts'
import { ensurePnpmAllowBuilds } from '../lib/pnpm.ts'
import type { ProjectContext } from '../lib/project.ts'
import { addPackages, execLocal, prismaDlx, run, type PackageManager } from '../lib/run.ts'
import { prismaContract } from '../templates/prisma-contract.ts'
import { prismaContractTs } from '../templates/prisma-contract-ts.ts'

function prismaEnv() {
  const extra = '--experimental-strip-types --no-warnings'
  const current = process.env.NODE_OPTIONS ?? ''
  return {
    NODE_OPTIONS: current.includes('experimental-strip-types') ? current : `${current} ${extra}`.trim(),
    PRISMA_SKILLS_CHECK: '0',
  }
}

async function runPrisma(pm: PackageManager, prismaArgs: string[], cwd: string) {
  try {
    await execLocal(pm, 'prisma', prismaArgs, cwd, prismaEnv())
  } catch {
    const { command, args: dlxArgs } = prismaDlx(pm)
    dlxArgs.push(...prismaArgs)
    await run(command, dlxArgs, cwd, prismaEnv())
  }
}

export async function runPrismaInit(options: {
  projectDir: string
  packageManager: PackageManager
  srcDir: boolean
}) {
  const schemaPath = options.srcDir ? 'src/prisma/contract.ts' : 'prisma/contract.ts'
  const { command, args } = prismaDlx(options.packageManager)
  args.push(
    'orm',
    'init',
    '--yes',
    '--target',
    'postgres',
    '--authoring',
    'typescript',
    '--schema-path',
    schemaPath
  )

  p.note(
    [
      'Prisma 8 is initialized non-interactively so the official wizard cannot',
      'swallow the terminal (Clack Done screen / missing @clack/core under pnpm).',
      '',
      pc.bold('Flags we pass:'),
      '  --yes --target postgres --authoring typescript',
      `  --schema-path ${schemaPath}`,
      '',
      'npx may sit quiet for a bit while it fetches prisma@latest.',
    ].join('\n'),
    'prisma orm init'
  )

  try {
    await run(command, args, options.projectDir, prismaEnv())
  } catch (error) {
    const configPath = path.join(options.projectDir, 'prisma.config.ts')
    if (!exists(configPath)) {
      throw error
    }

    p.log.warn('Prisma wrote its files but init did not finish. Completing install/emit ourselves.')
    ensurePnpmAllowBuilds(options.projectDir)
    try {
      await addPackages(options.packageManager, options.projectDir, ['@prisma/orm-postgres', 'dotenv'])
    } catch {
      p.log.warn('Retrying the Prisma package install failed. Continuing with whatever is already in package.json.')
    }
  }

  disableSkillsCheck(options.projectDir)
}

export async function overlayPrismaContract(ctx: ProjectContext) {
  const contractPath = ctx.prismaContractPath
  if (!contractPath) {
    p.log.warn('Prisma contract file not found. Skipping auth/post models.')
    return
  }

  if (contractPath.endsWith('.ts')) {
    writeText(contractPath, prismaContractTs)
  } else {
    writeText(contractPath, prismaContract)
  }

  p.log.success(`Wrote ${contractPath.replace(`${ctx.projectDir}/`, '')} with Better Auth + Post models`)
}

export async function emitPrismaContract(ctx: ProjectContext) {
  if (!ctx.prismaContractPath) return

  ensurePnpmAllowBuilds(ctx.projectDir)
  disableSkillsCheck(ctx.projectDir)

  try {
    await runPrisma(ctx.packageManager, ['contract', 'emit'], ctx.projectDir)
  } catch {
    if (ctx.prismaContractPath.endsWith('.ts')) {
      const pslPath = ctx.prismaContractPath.replace(/\.ts$/, '.prisma')
      writeText(pslPath, prismaContract)
      retargetPrismaConfig(ctx.projectDir, toProjectRelative(ctx.projectDir, pslPath))
      p.log.warn('TypeScript contract could not be loaded. Switched prisma.config.ts to the PSL file and retrying emit.')
      await runPrisma(ctx.packageManager, ['contract', 'emit'], ctx.projectDir)
      return
    }
    throw new Error('prisma contract emit failed')
  }
}

function disableSkillsCheck(projectDir: string) {
  patchPrismaDotenv(projectDir)
  const configPath = path.join(projectDir, 'prisma.config.ts')
  const current = readOptional(configPath)
  if (!current || current.includes('check: false')) return

  writeText(
    configPath,
    current.replace(
      /export default definePrismaConfig\(\{/,
      `export default definePrismaConfig({\n  skills: {\n    check: false,\n    agents: [],\n  },`
    )
  )
}

function patchPrismaDotenv(projectDir: string) {
  const configPath = path.join(projectDir, 'prisma.config.ts')
  const current = readOptional(configPath)
  if (!current || current.includes('.env.local')) return

  const loader = `import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv()
`

  const next = current.includes("import 'dotenv/config'") || current.includes('import "dotenv/config"')
    ? current.replace(/import ['"]dotenv\/config['"]\s*/, `${loader}\n`)
    : `${loader}\n${current}`

  writeText(configPath, next)
}

function retargetPrismaConfig(projectDir: string, contractRel: string) {
  const configPath = path.join(projectDir, 'prisma.config.ts')
  const current = readOptional(configPath)
  if (!current) return
  writeText(configPath, current.replace(/contract:\s*['"][^'"]+['"]/, `contract: './${contractRel}'`))
}

function toProjectRelative(projectDir: string, filePath: string) {
  return filePath.slice(projectDir.length + 1).replaceAll('\\', '/')
}
