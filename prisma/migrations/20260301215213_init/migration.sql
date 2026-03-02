-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "pin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bannerUrl" TEXT NOT NULL,
    "isAvailable1v1" BOOLEAN NOT NULL DEFAULT false,
    "isAvailableFFA" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable2v2" BOOLEAN NOT NULL DEFAULT false,
    "isBO3Preferred" BOOLEAN NOT NULL DEFAULT false,
    "isLongGame" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'round_robin_free',
    "pointSystem" TEXT NOT NULL DEFAULT '{"1st":4,"2nd":3,"3rd":2,"4th":1,"5th":0}',
    "winnerId" TEXT,
    "hostId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "finalPosition" INTEGER,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isMemeMatch" BOOLEAN NOT NULL DEFAULT false,
    "roundNumber" INTEGER NOT NULL,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameScore" INTEGER,
    "tournamentPoints" INTEGER NOT NULL,
    "placement" INTEGER NOT NULL,
    "teamId" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GameRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRating_matchId_playerId_key" ON "GameRating"("matchId", "playerId");
