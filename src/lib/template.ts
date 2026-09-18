export type TemplateContext = {
  projectName: string
  alias: string
  importPrefix: string
  libImport: string
  utilsImport: string
  uiImport: string
  prismaDbImport: string
  packageManager: string
  databaseUrl: string
  databasePort: string
  databaseName: string
}

export function toTemplateContext(ctx: TemplateContext): TemplateContext {
  return {
    projectName: ctx.projectName,
    alias: ctx.alias,
    importPrefix: ctx.importPrefix,
    libImport: ctx.libImport,
    utilsImport: ctx.utilsImport,
    uiImport: ctx.uiImport,
    prismaDbImport: ctx.prismaDbImport,
    packageManager: ctx.packageManager,
    databaseUrl: ctx.databaseUrl,
    databasePort: ctx.databasePort,
    databaseName: ctx.databaseName,
  }
}

export function t(template: string, ctx: TemplateContext) {
  return template
    .replaceAll('{{projectName}}', ctx.projectName)
    .replaceAll('{{alias}}', ctx.alias)
    .replaceAll('{{importPrefix}}', ctx.importPrefix)
    .replaceAll('{{libImport}}', ctx.libImport)
    .replaceAll('{{utilsImport}}', ctx.utilsImport)
    .replaceAll('{{uiImport}}', ctx.uiImport)
    .replaceAll('{{prismaDbImport}}', ctx.prismaDbImport)
    .replaceAll('{{packageManager}}', ctx.packageManager)
    .replaceAll('{{databaseUrl}}', ctx.databaseUrl)
    .replaceAll('{{databasePort}}', ctx.databasePort)
    .replaceAll('{{databaseName}}', ctx.databaseName)
}
