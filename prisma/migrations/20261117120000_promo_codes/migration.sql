-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "promo_discount_percent" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "original_total_rsd" INTEGER,
ADD COLUMN     "promo_code" TEXT,
ADD COLUMN     "promo_code_id" TEXT;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "base_delivery_fee_rsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "base_platform_fee_rsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discount_rsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "original_total_rsd" INTEGER;

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_email" TEXT,
    "owner_phone" TEXT,
    "commission_tenths" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" TEXT NOT NULL,
    "promo_code_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "base_rsd" INTEGER NOT NULL,
    "commission_tenths" INTEGER NOT NULL,
    "commission_rsd" INTEGER NOT NULL,
    "payout_id" TEXT,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_payouts" (
    "id" TEXT NOT NULL,
    "promo_code_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount_rsd" INTEGER NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promo_redemptions_order_id_key" ON "promo_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "promo_redemptions_promo_code_id_used_at_idx" ON "promo_redemptions"("promo_code_id", "used_at");

-- CreateIndex
CREATE UNIQUE INDEX "promo_payouts_promo_code_id_month_key" ON "promo_payouts"("promo_code_id", "month");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "promo_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_payouts" ADD CONSTRAINT "promo_payouts_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Bills made before promo codes were charged the normal fees.
UPDATE "bills" SET "base_delivery_fee_rsd" = "delivery_fee_rsd", "base_platform_fee_rsd" = "platform_fee_rsd";

-- A bill's total now subtracts the promo discount, which never exceeds its items.
ALTER TABLE "bills" DROP CONSTRAINT "bills_total_adds_up";
ALTER TABLE "bills" ADD CONSTRAINT "bills_total_adds_up"
  CHECK ("total_rsd" = "subtotal_rsd" - "discount_rsd" + "delivery_fee_rsd" + "platform_fee_rsd");
ALTER TABLE "bills" ADD CONSTRAINT "bills_discount_within_items"
  CHECK ("discount_rsd" BETWEEN 0 AND "subtotal_rsd");
