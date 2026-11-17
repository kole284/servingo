-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('card', 'invoice');

-- AlterEnum
ALTER TYPE "order_status" ADD VALUE 'on_invoice';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "company_fee_percent" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "company_invoice_id" TEXT,
ADD COLUMN     "payment_method" "payment_method" NOT NULL DEFAULT 'card';

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pib" TEXT NOT NULL,
    "mb" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "billing_email" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "email_domain" TEXT,
    "fee_percent" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "subtotal_rsd" INTEGER NOT NULL,
    "delivery_rsd" INTEGER NOT NULL,
    "fee_rsd" INTEGER NOT NULL,
    "total_rsd" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),

CONSTRAINT "company_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_pib_key" ON "companies"("pib");

-- CreateIndex
CREATE UNIQUE INDEX "companies_order_code_key" ON "companies"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_company_id_email_key" ON "company_members"("company_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "company_invoices_number_key" ON "company_invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "company_invoices_company_id_month_key" ON "company_invoices"("company_id", "month");

-- CreateIndex
CREATE INDEX "orders_company_id_created_at_idx" ON "orders"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_invoice_id_fkey" FOREIGN KEY ("company_invoice_id") REFERENCES "company_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invoices" ADD CONSTRAINT "company_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
