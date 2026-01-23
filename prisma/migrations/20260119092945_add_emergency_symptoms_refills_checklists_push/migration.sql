-- CreateEnum
CREATE TYPE "SymptomType" AS ENUM ('FATIGUE', 'NAUSEA', 'PAIN', 'APPETITE', 'SLEEP', 'MOOD', 'CUSTOM');

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "lastRefillDate" TIMESTAMP(3),
ADD COLUMN     "pillCount" INTEGER,
ADD COLUMN     "pillsPerDose" INTEGER DEFAULT 1,
ADD COLUMN     "refillThreshold" INTEGER DEFAULT 7;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "patientDOB" TIMESTAMP(3),
ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "physicianPhone" TEXT,
ADD COLUMN     "primaryPhysician" TEXT;

-- CreateTable
CREATE TABLE "Symptom" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "SymptomType" NOT NULL,
    "customName" TEXT,
    "severity" INTEGER NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentChecklist" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Symptom_workspaceId_recordedAt_idx" ON "Symptom"("workspaceId", "recordedAt");

-- CreateIndex
CREATE INDEX "Symptom_workspaceId_type_idx" ON "Symptom"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Symptom_workspaceId_deletedAt_idx" ON "Symptom"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "Symptom_syncedAt_idx" ON "Symptom"("syncedAt");

-- CreateIndex
CREATE INDEX "AppointmentChecklist_appointmentId_idx" ON "AppointmentChecklist"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentChecklist_workspaceId_idx" ON "AppointmentChecklist"("workspaceId");

-- CreateIndex
CREATE INDEX "PushSubscription_workspaceId_idx" ON "PushSubscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "Symptom" ADD CONSTRAINT "Symptom_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Symptom" ADD CONSTRAINT "Symptom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentChecklist" ADD CONSTRAINT "AppointmentChecklist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentChecklist" ADD CONSTRAINT "AppointmentChecklist_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
