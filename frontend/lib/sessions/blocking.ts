export interface BlockableParticipant {
  blocked: boolean;
  has_submitted: boolean;
}

export function canAdminBlockParticipant(
  participant: BlockableParticipant,
): boolean {
  return !participant.blocked;
}
