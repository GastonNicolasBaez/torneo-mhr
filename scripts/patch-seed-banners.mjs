// Patches all bannerUrl values in prisma/seed.ts to use real image URLs
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.resolve(__dirname, '..', 'prisma', 'seed.ts');

const banners = {
  "Mortal Kombat":        "https://cdn.akamai.steamstatic.com/steam/apps/976310/header.jpg",
  "Tekken 8":             "https://cdn.akamai.steamstatic.com/steam/apps/1778820/header.jpg",
  "Dragon Ball FighterZ": "https://cdn.akamai.steamstatic.com/steam/apps/678950/header.jpg",
  "MultiVersus":          "https://cdn.akamai.steamstatic.com/steam/apps/1818750/header.jpg",
  "Super Smash Bros":     "https://cdn.akamai.steamstatic.com/steam/apps/1489870/header.jpg",
  "Straftat":             "https://cdn.akamai.steamstatic.com/steam/apps/1840080/header.jpg",
  "Tateti BO3":           "https://placehold.co/460x215/0f3460/e94560?text=Tateti+BO3",
  "FPS Chess":            "https://cdn.akamai.steamstatic.com/steam/apps/1902490/header.jpg",
  "Tetris":               "https://cdn.akamai.steamstatic.com/steam/apps/1147690/header.jpg",
  "Puzzle Bobble":        "https://cdn.akamai.steamstatic.com/steam/apps/1281590/header.jpg",
  "Haxball":              "https://placehold.co/460x215/1b4332/40916c?text=Haxball",
  "Rocket League":        "https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg",
  "Battlerite":           "https://cdn.akamai.steamstatic.com/steam/apps/504370/header.jpg",
  "Rematch":              "https://cdn.akamai.steamstatic.com/steam/apps/3314070/header.jpg",
  "CS 2":                 "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
  "CS 1.6":               "https://cdn.akamai.steamstatic.com/steam/apps/10/header.jpg",
  "Valorant":             "https://cdn.akamai.steamstatic.com/steam/apps/2693440/header.jpg",
  "Quake Champions":      "https://cdn.akamai.steamstatic.com/steam/apps/611500/header.jpg",
  "COD / BO3":            "https://cdn.akamai.steamstatic.com/steam/apps/311210/header.jpg",
  "Overwatch":            "https://cdn.akamai.steamstatic.com/steam/apps/2357570/header.jpg",
  "Marvel Rivals":        "https://cdn.akamai.steamstatic.com/steam/apps/2767030/header.jpg",
  "Team Fortress 2":      "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg",
  "Half-Life Deathmatch": "https://cdn.akamai.steamstatic.com/steam/apps/70/header.jpg",
  "Serious Sam":          "https://cdn.akamai.steamstatic.com/steam/apps/41070/header.jpg",
  "PUBG":                 "https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg",
  "Apex Legends":         "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg",
  "Fall Guys":            "https://cdn.akamai.steamstatic.com/steam/apps/1097150/header.jpg",
  "Dark and Darker":      "https://cdn.akamai.steamstatic.com/steam/apps/2016590/header.jpg",
  "FIFA (Fafa)":          "https://cdn.akamai.steamstatic.com/steam/apps/2195250/header.jpg",
  "Need for Speed":       "https://cdn.akamai.steamstatic.com/steam/apps/1262630/header.jpg",
  "League of Legends":    "https://cdn.akamai.steamstatic.com/steam/apps/2801230/header.jpg",
  "Age of Empires 2":     "https://cdn.akamai.steamstatic.com/steam/apps/813780/header.jpg",
  "Warcraft":             "https://cdn.akamai.steamstatic.com/steam/apps/1370320/header.jpg",
  "Rust":                 "https://cdn.akamai.steamstatic.com/steam/apps/252490/header.jpg",
  "Colonist (Catan)":     "https://placehold.co/460x215/7b4f2e/f5cba7?text=Colonist+(Catan)",
  "GeoGuessr":            "https://cdn.akamai.steamstatic.com/steam/apps/1714490/header.jpg",
  "Truco":                "https://placehold.co/460x215/145a32/27ae60?text=Truco",
};

let content = readFileSync(seedPath, 'utf-8');
let replacements = 0;

for (const [name, url] of Object.entries(banners)) {
  // Match bannerUrl lines for this game (placehold.co or old URLs)
  const regex = new RegExp(`(name: "${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",\\s*\\n\\s*bannerUrl:\\s*)"[^"]*"`, 'g');
  const newContent = content.replace(regex, `$1"${url}"`);
  if (newContent !== content) {
    replacements++;
    content = newContent;
  }
}

writeFileSync(seedPath, content);
console.log(`✓ Patched ${replacements} bannerUrl values in seed.ts`);
