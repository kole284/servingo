-- CreateEnum
CREATE TYPE "partner_kind" AS ENUM ('restoran', 'poslasticarnica', 'vinoteka', 'drugo');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('new', 'contacted', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "contact_email" TEXT NOT NULL DEFAULT 'podrska@servingo.rs';

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "order_code" TEXT,
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_applications" (
    "id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "kind" "partner_kind" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "message" TEXT,
    "status" "application_status" NOT NULL DEFAULT 'new',
    "locale" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_ip_hash_created_at_idx" ON "contact_messages"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "partner_applications_ip_hash_created_at_idx" ON "partner_applications"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "partner_applications_status_idx" ON "partner_applications"("status");
