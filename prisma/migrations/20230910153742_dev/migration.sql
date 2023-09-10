-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateTable
CREATE TABLE "pessoas" (
    "id" TEXT NOT NULL,
    "apelido" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nascimento" TEXT NOT NULL,
    "stack" TEXT[],
    "stackNameApelido" TEXT NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_apelido_key" ON "pessoas"("apelido");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_stackNameApelido_key" ON "pessoas"("stackNameApelido");

-- CreateIndex
CREATE INDEX "pessoas_stackNameApelido_idx" ON "pessoas"("stackNameApelido");
