import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { LinkedAccountInput } from "@/lib/codef/types";
import { getCodefServiceTypeName } from "@/lib/codef/client";
import { stableHash } from "@/lib/codef/hash";

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

  return prisma.linkedFinancialAccount.upsert({
    where: {
      codefConnectionId_organization_businessType_sourceKind_identifierHash: {
        codefConnectionId: connection.id,
        organization: input.organization,
        businessType: input.businessType,
        sourceKind: input.sourceKind,
        identifierHash: input.identifierHash,
      },
    },
    update: {
      displayName: input.displayName,
      maskedIdentifier: input.maskedIdentifier,
      loginType: input.loginType,
      isActive: true,
    },
    create: {
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
