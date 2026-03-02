import prisma from "./prisma";

export type AuditAction =
  | "RESULT_SUBMITTED"
  | "RESULT_CONFIRMED"
  | "DISPUTE_RAISED"
  | "ADMIN_RESOLVED"
  | "MATCH_CANCELLED";

export async function logAudit(
  matchId: string,
  action: AuditAction,
  playerId: string,
  details: Record<string, unknown>,
  resolvedBy?: string
) {
  return prisma.auditLog.create({
    data: {
      matchId,
      action,
      playerId,
      resolvedBy,
      details: JSON.stringify(details),
    },
  });
}

export async function getMatchAuditLog(matchId: string) {
  return prisma.auditLog.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });
}
