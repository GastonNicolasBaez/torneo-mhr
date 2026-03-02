import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = require("path").resolve(__dirname, "..", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const games = [
  // JUEGOS DE PELEA / CORTOS (1v1, BO3)
  {
    name: "Mortal Kombat",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/976310/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 0,
  },
  {
    name: "Tekken 8",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1778820/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 1,
  },
  {
    name: "Dragon Ball FighterZ",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/678950/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 2,
  },
  {
    name: "MultiVersus",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1818750/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 3,
  },
  {
    name: "Super Smash Bros",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/1489870/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 4,
  },
  {
    name: "Straftat",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1840080/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 5,
  },
  {
    name: "Tateti BO3",
    bannerUrl: "https://placehold.co/460x215/0f3460/e94560?text=Tateti+BO3",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 6,
  },
  {
    name: "FPS Chess",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1902490/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 7,
  },
  {
    name: "Tetris",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1147690/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 8,
  },
  {
    name: "Puzzle Bobble",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/1281590/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 9,
  },
  {
    name: "Haxball",
    bannerUrl: "https://placehold.co/460x215/1b4332/40916c?text=Haxball",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 10,
  },
  {
    name: "Rocket League",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 11,
  },
  {
    name: "Battlerite",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/504370/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 12,
  },
  {
    name: "Rematch",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3314070/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 13,
  },
  // SHOOTERS COMPETITIVOS
  {
    name: "CS 2",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 14,
  },
  {
    name: "CS 1.6",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/10/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 15,
  },
  {
    name: "Valorant",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2693440/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 16,
  },
  {
    name: "Quake Champions",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/611500/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 17,
  },
  {
    name: "COD / BO3",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/311210/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: true,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 18,
  },
  {
    name: "Overwatch",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2357570/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 19,
  },
  {
    name: "Marvel Rivals",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2767030/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 20,
  },
  {
    name: "Team Fortress 2",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: true,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 21,
  },
  {
    name: "Half-Life Deathmatch",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/70/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 22,
  },
  {
    name: "Serious Sam",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/41070/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 23,
  },
  // BATTLE ROYALE / FFA LARGO
  {
    name: "PUBG",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: true,
    orderIndex: 24,
  },
  {
    name: "Apex Legends",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 25,
  },
  {
    name: "Fall Guys",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1097150/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 26,
  },
  {
    name: "Dark and Darker",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/2016590/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: true,
    orderIndex: 27,
  },
  // DEPORTES / CARRERA
  {
    name: "FIFA (Fafa)",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2195250/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 28,
  },
  {
    name: "Need for Speed",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/1262630/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 29,
  },
  // ESTRATEGIA / LARGO
  {
    name: "League of Legends",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/2801230/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: true,
    orderIndex: 30,
  },
  {
    name: "Age of Empires 2",
    bannerUrl:
      "https://cdn.akamai.steamstatic.com/steam/apps/813780/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: true,
    orderIndex: 31,
  },
  {
    name: "Warcraft",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1370320/header.jpg",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: true,
    orderIndex: 32,
  },
  // SUPERVIVENCIA / LARGO
  {
    name: "Rust",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/252490/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: true,
    orderIndex: 33,
  },
  // JUEGOS DE MESA / CASUAL
  {
    name: "Colonist (Catan)",
    bannerUrl:
      "https://placehold.co/460x215/7b4f2e/f5cba7?text=Colonist+(Catan)",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 34,
  },
  {
    name: "GeoGuessr",
    bannerUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1714490/header.jpg",
    isAvailable1v1: false,
    isAvailableFFA: true,
    isAvailable2v2: false,
    isBO3Preferred: false,
    isLongGame: false,
    orderIndex: 35,
  },
  {
    name: "Truco",
    bannerUrl: "https://placehold.co/460x215/145a32/27ae60?text=Truco",
    isAvailable1v1: true,
    isAvailableFFA: false,
    isAvailable2v2: true,
    isBO3Preferred: true,
    isLongGame: false,
    orderIndex: 36,
  },
];

const players = [
  {
    name: "rOzz",
    avatarEmoji: "🎮",
    colorHex: "#FF6B00",
    pin: "1234",
  },
  {
    name: "Severuss",
    avatarEmoji: "🧙",
    colorHex: "#a78bfa",
    pin: "2345",
  },
  {
    name: "most.",
    avatarEmoji: "🔥",
    colorHex: "#FF4655",
    pin: "3456",
  },
  {
    name: "Xerusky",
    avatarEmoji: "⚡",
    colorHex: "#00FF87",
    pin: "4567",
  },
  {
    name: "Sincalir",
    avatarEmoji: "💎",
    colorHex: "#4E9AF1",
    pin: "5678",
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.gameRating.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.match.deleteMany();
  await prisma.tournamentPlayer.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.game.deleteMany();
  await prisma.player.deleteMany();

  // Seed games
  for (const game of games) {
    await prisma.game.create({ data: game });
  }
  console.log(`✓ Created ${games.length} games`);

  // Seed players
  for (const player of players) {
    await prisma.player.create({ data: player });
  }
  console.log(`✓ Created ${players.length} players`);

  console.log("Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
