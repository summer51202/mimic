import { FinancialSpaceMode, PrismaClient, SpaceParticipantRole } from '@prisma/client';

export interface FinancialSpaceSeed {
  groupId: string;
  managerId: string;
  participantId: string;
  spaceIds: { personal: string; shared: string; pooled: string };
}

export async function seedFinancialSpaces(prisma: PrismaClient, fixture: FinancialSpaceSeed): Promise<void> {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const openedOn = new Date(`${date}T00:00:00.000Z`);
  const definitions: Array<{ id: string; name: string; mode: FinancialSpaceMode }> = [
    { id: fixture.spaceIds.personal, name: '我的日常', mode: 'PERSONAL_EXPENSES' },
    { id: fixture.spaceIds.shared, name: '一起旅行', mode: 'SHARED_EXPENSES' },
    { id: fixture.spaceIds.pooled, name: '共同生活基金', mode: 'POOLED_FUND' },
  ];
  for (const definition of definitions) {
    const personal = definition.mode === 'PERSONAL_EXPENSES';
    const participants: Array<{ userId: string; role: SpaceParticipantRole; effectiveFrom: Date }> = [
      { userId: fixture.managerId, role: SpaceParticipantRole.MANAGER, effectiveFrom: openedOn },
    ];
    if (!personal) participants.push({ userId: fixture.participantId, role: SpaceParticipantRole.PARTICIPANT, effectiveFrom: openedOn });
    await prisma.financialSpace.upsert({ where: { id: definition.id }, update: {}, create: {
      ...definition, currency: 'TWD', timezone: 'Asia/Taipei', openedOn,
      groupId: personal ? null : fixture.groupId, ownerUserId: personal ? fixture.managerId : null,
      createdById: fixture.managerId, participants: { create: participants },
      auditEvents: { create: { actorUserId: fixture.managerId, action: 'CREATE', after: { ...definition, source: 'local_seed' } } },
    } });
  }
}
