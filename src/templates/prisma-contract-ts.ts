export const prismaContractTs = `import { defineContract } from '@prisma/orm-postgres/contract-builder'

export const contract = defineContract({}, ({ field, model, rel }) => {
  // Better Auth uses timestamp(3). Prisma field.dateTime() is timestamptz, which db init cannot alter.
  const timestamp = () => field.temporal.timestampString(3)
  const timestampNow = () => field.temporal.timestampString(3).defaultSql('CURRENT_TIMESTAMP')
  // text + cuid2 generator: field.id.cuid2() is character(24), which db init cannot alter from Better Auth text ids.
  const id = () =>
    field
      .generated({
        type: { codecId: 'pg/text@1', nativeType: 'text' },
        generated: { kind: 'generator', id: 'cuid2' },
      })
      .id()

  const User = model('User', {
    fields: {
      id: id(),
      name: field.text(),
      email: field.text(),
      emailVerified: field.boolean().default(false),
      image: field.text().optional(),
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
    },
  })

  const Session = model('Session', {
    fields: {
      id: id(),
      expiresAt: timestamp(),
      token: field.text(),
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
      ipAddress: field.text().optional(),
      userAgent: field.text().optional(),
      userId: field.text(),
    },
  })

  const Account = model('Account', {
    fields: {
      id: id(),
      accountId: field.text(),
      providerId: field.text(),
      userId: field.text(),
      accessToken: field.text().optional(),
      refreshToken: field.text().optional(),
      idToken: field.text().optional(),
      accessTokenExpiresAt: timestamp().optional(),
      refreshTokenExpiresAt: timestamp().optional(),
      scope: field.text().optional(),
      password: field.text().optional(),
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
    },
  })

  const Verification = model('Verification', {
    fields: {
      id: id(),
      identifier: field.text(),
      value: field.text(),
      expiresAt: timestamp(),
      createdAt: timestamp().optional(),
      updatedAt: timestamp().optional(),
    },
  })

  const Post = model('Post', {
    fields: {
      id: id(),
      title: field.text(),
      body: field.text(),
      slug: field.text().unique(),
      published: field.boolean().default(false),
      authorId: field.text(),
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
    },
  })

  return {
    models: {
      User: User.relations({
        sessions: rel.hasMany(Session, { by: 'userId' }),
        accounts: rel.hasMany(Account, { by: 'userId' }),
        posts: rel.hasMany(Post, { by: 'authorId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'user',
        // Better Auth creates UNIQUE INDEX user_email_key, not a UNIQUE CONSTRAINT.
        indexes: [constraints.index([cols.email], { unique: true, map: 'user_email_key' })],
      })),
      Session: Session.relations({
        user: rel.belongsTo(User, { from: 'userId', to: 'id' }),
      }).sql(({ cols, constraints }) => ({
        table: 'session',
        indexes: [constraints.index([cols.token], { unique: true, map: 'session_token_key' })],
      })),
      Account: Account.relations({
        user: rel.belongsTo(User, { from: 'userId', to: 'id' }),
      }).sql({ table: 'account' }),
      Verification: Verification.sql({ table: 'verification' }),
      Post: Post.relations({
        author: rel.belongsTo(User, { from: 'authorId', to: 'id' }),
      }).sql({ table: 'post' }),
    },
  }
})
`
