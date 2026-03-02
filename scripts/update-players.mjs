import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'dev.db').split('\\').join('/');

const adapter = new PrismaLibSql({ url: 'file:' + dbPath });
const prisma = new PrismaClient({ adapter });

const updates = [
  { currentName: 'Nicolás',   newName: 'rOzz',     avatarEmoji: '🎮', colorHex: '#FF6B00' },
  { currentName: 'Jugador 2', newName: 'Severuss',  avatarEmoji: '🧙', colorHex: '#a78bfa' },
  { currentName: 'Jugador 3', newName: 'most.',     avatarEmoji: '🔥', colorHex: '#FF4655' },
  { currentName: 'Jugador 4', newName: 'Xerusky',   avatarEmoji: '⚡', colorHex: '#00FF87' },
  { currentName: 'Jugador 5', newName: 'Sincalir',  avatarEmoji: '💎', colorHex: '#4E9AF1' },
];

const players = await prisma.player.findMany({ orderBy: { createdAt: 'asc' } });

for (let i = 0; i < players.length && i < updates.length; i++) {
  const u = updates[i];
  await prisma.player.update({
    where: { id: players[i].id },
    data: { name: u.newName, avatarEmoji: u.avatarEmoji, colorHex: u.colorHex },
  });
  console.log(`✓ ${u.currentName} → ${u.newName}`);
}

const final = await prisma.player.findMany({ orderBy: { createdAt: 'asc' } });
console.log('\nJugadores finales:');
final.forEach((p, i) => console.log(`  ${i+1}. ${p.avatarEmoji} ${p.name} | PIN: ${p.pin} | ${p.colorHex}`));

await prisma.$disconnect();
