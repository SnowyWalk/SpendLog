import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { LinkedAccountInput } from "@/lib/codef/types";
import { getCodefServiceTypeName } from "@/lib/codef/client";
import { stableHash } from "@/lib/codef/hash";

function visibleDigitCount(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").length;
}

function lastVisibleDigits(value?: string | null, length = 4) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= length ? digits.slice(-length) : null;
}

function pickPreferredMaskedIdentifier(
  current?: string | null,
  next?: string | null
) {
  if (!next) {
    return current ?? undefined;
  }
  if (!current) {
    return next;
  }

  const currentDigits = visibleDigitCount(current);
  const nextDigits = visibleDigitCount(next);
  if (nextDigits > currentDigits) {
    return next;
  }
  if (nextDigits === currentDigits && next.length > current.length) {
    return next;
  }
  return current;
}

export async function resolveCodefConnection(prisma: PrismaClient) {
  const connectedId = process.env.CODEF_CONNECTED_ID;
  if (!connectedId) {
    throw new Error("CODEF_CONNECTED_ID is required");
  }

  return prisma.codefConnection.upsert({
    where: { connectedIdHash: stableHash(["connectedId", connectedId]) },
    update: {
      displayName: "Default CODEF Connection",
      isActive: true,
    },
    create: {
      displayName: "Default CODEF Connection",
      connectedIdHash: stableHash(["connectedId", connectedId]),
      serviceType: getCodefServiceTypeName(),
      isActive: true,
    },
  });
}

export async function resolveLinkedFinancialAccount(
  prisma: PrismaClient,
  input: LinkedAccountInput
) {
  const connection = await resolveCodefConnection(prisma);
  const candidateHashes = [
    input.identifierHash,
    ...(input.alternateIdentifierHashes ?? []),
  ];
  const samsungCardLast4 =
    input.organization === "0303" ? lastVisibleDigits(input.maskedIdentifier) : null;

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.linkedFinancialAccount.findMany({
      where: {
        codefConnectionId: connection.id,
        organization: input.organization,
        businessType: input.businessType,
        sourceKind: input.sourceKind,
        OR: [
          { identifierHash: { in: candidateHashes } },
          ...(samsungCardLast4
            ? [{ maskedIdentifier: { endsWith: samsungCardLast4 } }]
            : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    if (candidates.length === 0) {
      return tx.linkedFinancialAccount.create({
        data: {
          codefConnectionId: connection.id,
          organization: input.organization,
          businessType: input.businessType,
          clientType: "P",
          sourceKind: input.sourceKind,
          displayName: input.displayName,
          maskedIdentifier: input.maskedIdentifier,
          identifierHash: input.identifierHash,
          loginType: input.loginType,
          isActive: true,
        },
      });
    }

    const target = [...candidates].sort((a, b) => {
      const digitDelta =
        visibleDigitCount(b.maskedIdentifier) - visibleDigitCount(a.maskedIdentifier);
      const lengthDelta =
        (b.maskedIdentifier?.length ?? 0) - (a.maskedIdentifier?.length ?? 0);
      return digitDelta || lengthDelta;
    })[0];
    const duplicates = candidates.filter((candidate) => candidate.id !== target.id);

    for (const duplicate of duplicates) {
      const duplicateTransactions = await tx.transaction.findMany({
        where: { linkedFinancialAccountId: duplicate.id },
        select: { id: true, rawFingerprint: true },
      });

      for (const transaction of duplicateTransactions) {
        const existing = await tx.transaction.findUnique({
          where: {
            linkedFinancialAccountId_rawFingerprint: {
              linkedFinancialAccountId: target.id,
              rawFingerprint: transaction.rawFingerprint,
            },
          },
          select: { id: true },
        });

        if (existing) {
          await tx.transaction.delete({ where: { id: transaction.id } });
        } else {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { linkedFinancialAccountId: target.id },
          });
        }
      }

      await tx.linkedFinancialAccount.delete({ where: { id: duplicate.id } });
    }

    return tx.linkedFinancialAccount.update({
      where: { id: target.id },
      data: {
        displayName: input.displayName,
        maskedIdentifier: pickPreferredMaskedIdentifier(
          target.maskedIdentifier,
          input.maskedIdentifier
        ),
        identifierHash: input.identifierHash,
        loginType: input.loginType,
        isActive: true,
      },
    });
  });
}
