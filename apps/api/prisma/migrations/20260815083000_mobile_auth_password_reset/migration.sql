-- Password reset challenges + optional platform on trusted devices
CREATE TABLE IF NOT EXISTS "PasswordResetChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetChallenge_challengeHash_key" ON "PasswordResetChallenge"("challengeHash");
CREATE INDEX IF NOT EXISTS "PasswordResetChallenge_userId_createdAt_idx" ON "PasswordResetChallenge"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "PasswordResetChallenge"
    ADD CONSTRAINT "PasswordResetChallenge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TrustedDevice" ADD COLUMN IF NOT EXISTS "platform" TEXT;
