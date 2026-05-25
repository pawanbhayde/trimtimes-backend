/*
  Warnings:

  - You are about to drop the column `service_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tenant_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `treatment_id` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_service_id_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "service_id",
ADD COLUMN     "artisan_id" TEXT,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "treatment_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "services";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "ServiceStatus";

-- DropEnum
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "artisans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
