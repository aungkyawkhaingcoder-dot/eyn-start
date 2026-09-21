-- CreateTable
CREATE TABLE "Otp" (
    "id" SERIAL NOT NULL,
    "otp" VARCHAR(6) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "rememberToken" TEXT NOT NULL,
    "verifyToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "count" SMALLINT NOT NULL DEFAULT 0,
    "error" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);
