/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TRAVEL', 'FOOD', 'ACCOMMODATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GEOFENCE';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MANAGER', 'FIELD_STAFF');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FIELD_STAFF';
COMMIT;

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "alertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GeofenceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pathGeoJson" JSONB,
    "attendanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "date" DATE NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveBalance_userId_idx" ON "LeaveBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_type_year_key" ON "LeaveBalance"("userId", "type", "year");

-- CreateIndex
CREATE INDEX "GeofenceAlert_userId_idx" ON "GeofenceAlert"("userId");

-- CreateIndex
CREATE INDEX "GeofenceAlert_territoryId_idx" ON "GeofenceAlert"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelLog_attendanceId_key" ON "TravelLog"("attendanceId");

-- CreateIndex
CREATE INDEX "TravelLog_userId_date_idx" ON "TravelLog"("userId", "date");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_approvedById_idx" ON "Expense"("approvedById");

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceAlert" ADD CONSTRAINT "GeofenceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceAlert" ADD CONSTRAINT "GeofenceAlert_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelLog" ADD CONSTRAINT "TravelLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
