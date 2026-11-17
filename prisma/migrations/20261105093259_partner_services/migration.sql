-- Partner applications list the site's categories they would offer instead of a business type.
-- Existing applications get an empty list; their message usually says what they offer.
ALTER TABLE "partner_applications" ADD COLUMN "services" "service"[] NOT NULL DEFAULT '{}';
ALTER TABLE "partner_applications" ALTER COLUMN "services" DROP DEFAULT;
ALTER TABLE "partner_applications" DROP COLUMN "kind";
DROP TYPE "partner_kind";
