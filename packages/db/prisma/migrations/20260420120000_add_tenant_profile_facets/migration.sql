-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "website" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
