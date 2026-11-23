CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CANCELLED');
CREATE TYPE "ProcessStep" AS ENUM ('CREATED', 'CAPACITY_RESERVED', 'PAYMENT_APPROVED', 'TICKETS_ISSUED', 'COMPLETED');

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "sector_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(12,2),
  "total_amount" DECIMAL(12,2),
  "currency" CHAR(3) NOT NULL DEFAULT 'BOB',
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "process_step" "ProcessStep" NOT NULL DEFAULT 'CREATED',
  "release_pending" BOOLEAN NOT NULL DEFAULT false,
  "failure_code" VARCHAR(80),
  "last_error" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_quantity_check" CHECK ("quantity" BETWEEN 1 AND 6),
  CONSTRAINT "orders_amounts_check" CHECK (
    ("unit_price" IS NULL AND "total_amount" IS NULL) OR
    ("unit_price" >= 0 AND "total_amount" = "unit_price" * "quantity")
  )
);

CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");
CREATE INDEX "orders_event_id_status_idx" ON "orders"("event_id", "status");
CREATE INDEX "orders_status_process_step_idx" ON "orders"("status", "process_step");
