-- CreateTable
CREATE TABLE "Mixtape" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,

    CONSTRAINT "Mixtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "mixtapeId" TEXT NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mixtape_shareId_key" ON "Mixtape"("shareId");

-- CreateIndex
CREATE INDEX "Mixtape_createdBy_idx" ON "Mixtape"("createdBy");

-- CreateIndex
CREATE INDEX "Song_mixtapeId_idx" ON "Song"("mixtapeId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_mixtapeId_fkey" FOREIGN KEY ("mixtapeId") REFERENCES "Mixtape"("id") ON DELETE CASCADE ON UPDATE CASCADE;
