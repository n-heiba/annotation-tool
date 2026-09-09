-- CreateTable
CREATE TABLE "Audio" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnotationSpan" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnotationSpan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingCondition" (
    "id" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "bitDepth" INTEGER,
    "metadataRaw" JSONB,
    "speechRateWpm" DOUBLE PRECISION,
    "speechRateOverride" DOUBLE PRECISION,
    "distanceEstimate" DOUBLE PRECISION,
    "distanceOverride" DOUBLE PRECISION,

    CONSTRAINT "RecordingCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_audioId_key" ON "Transcript"("audioId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingCondition_audioId_key" ON "RecordingCondition"("audioId");

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationSpan" ADD CONSTRAINT "AnnotationSpan_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingCondition" ADD CONSTRAINT "RecordingCondition_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
