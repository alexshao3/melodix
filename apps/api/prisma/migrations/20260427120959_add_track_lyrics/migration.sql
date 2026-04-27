-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "lyrics" TEXT,
ADD COLUMN     "lyricsAlignedAt" TIMESTAMP(3),
ADD COLUMN     "syncedLyrics" TEXT;
