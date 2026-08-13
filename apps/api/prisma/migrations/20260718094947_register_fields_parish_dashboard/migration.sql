-- CreateEnum
CREATE TYPE "MemberLifeStatus" AS ENUM ('ALIVE', 'DECEASED', 'TRANSFERRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaritalStatus" ADD VALUE 'BACHELOR';
ALTER TYPE "MaritalStatus" ADD VALUE 'WIDOWER';
ALTER TYPE "MaritalStatus" ADD VALUE 'VIRGIN';
ALTER TYPE "MaritalStatus" ADD VALUE 'WIDOW';

-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "income" DECIMAL(12,2),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "aadhaar" TEXT,
ADD COLUMN     "lifeStatus" "MemberLifeStatus" NOT NULL DEFAULT 'ALIVE',
ADD COLUMN     "tribe" TEXT;

-- AlterTable
ALTER TABLE "SacramentRecord" ADD COLUMN     "bann1At" TIMESTAMP(3),
ADD COLUMN     "bann2At" TIMESTAMP(3),
ADD COLUMN     "bann3At" TIMESTAMP(3),
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "brideDob" TIMESTAMP(3),
ADD COLUMN     "brideDomicile" TEXT,
ADD COLUMN     "brideFatherName" TEXT,
ADD COLUMN     "brideMaritalStatus" TEXT,
ADD COLUMN     "brideMotherName" TEXT,
ADD COLUMN     "brideNationality" TEXT,
ADD COLUMN     "brideOccupation" TEXT,
ADD COLUMN     "bridePreviousSpouse" TEXT,
ADD COLUMN     "brideSurname" TEXT,
ADD COLUMN     "bridegroomDob" TIMESTAMP(3),
ADD COLUMN     "bridegroomDomicile" TEXT,
ADD COLUMN     "bridegroomFatherName" TEXT,
ADD COLUMN     "bridegroomMaritalStatus" TEXT,
ADD COLUMN     "bridegroomMotherName" TEXT,
ADD COLUMN     "bridegroomNationality" TEXT,
ADD COLUMN     "bridegroomOccupation" TEXT,
ADD COLUMN     "bridegroomPreviousSpouse" TEXT,
ADD COLUMN     "bridegroomSurname" TEXT,
ADD COLUMN     "causeOfDeath" TEXT,
ADD COLUMN     "childGender" "Gender",
ADD COLUMN     "childName" TEXT,
ADD COLUMN     "dispensationNotes" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "fatherOccupation" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "parentsDomicile" TEXT,
ADD COLUMN     "parishPriestName" TEXT,
ADD COLUMN     "placeOfBaptism" TEXT,
ADD COLUMN     "placeOfDeath" TEXT,
ADD COLUMN     "placeOfMarriage" TEXT,
ADD COLUMN     "schoolName" TEXT,
ADD COLUMN     "signaturesJson" JSONB,
ADD COLUMN     "witness1Village" TEXT,
ADD COLUMN     "witness2Village" TEXT;
