export const prismaContract = `// use prisma-8

model User {
  id            String             @id @default(cuid(2))
  name          String
  email         String
  emailVerified Boolean           @default(false)
  image         String?
  createdAt     TimestampString(3) @default(now())
  updatedAt     TimestampString(3) @default(now())
  sessions      Session[]
  accounts      Account[]
  posts         Post[]

  @@index([email], unique: true, map: "user_email_key")
  @@map("user")
}

model Session {
  id        String             @id @default(cuid(2))
  expiresAt TimestampString(3)
  token     String
  createdAt TimestampString(3) @default(now())
  updatedAt TimestampString(3) @default(now())
  ipAddress String?
  userAgent String?
  userId    String
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token], unique: true, map: "session_token_key")
  @@map("session")
}

model Account {
  id                    String              @id @default(cuid(2))
  accountId             String
  providerId            String
  userId                String
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  TimestampString(3)?
  refreshTokenExpiresAt TimestampString(3)?
  scope                 String?
  password              String?
  createdAt             TimestampString(3)  @default(now())
  updatedAt             TimestampString(3)  @default(now())

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String              @id @default(cuid(2))
  identifier String
  value      String
  expiresAt  TimestampString(3)
  createdAt  TimestampString(3)? @default(now())
  updatedAt  TimestampString(3)?

  @@index([identifier])
  @@map("verification")
}

model Post {
  id        String             @id @default(cuid(2))
  title     String
  body      String
  slug      String             @unique
  published Boolean            @default(false)
  authorId  String
  author    User               @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt TimestampString(3) @default(now())
  updatedAt TimestampString(3) @default(now())

  @@index([authorId])
  @@map("post")
}
`
