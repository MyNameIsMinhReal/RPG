import { MessageComponentInteraction } from 'discord.js';

/**
 * Filter for awaitMessageComponent / createMessageComponentCollector.
 * Auto-replies with an ephemeral message to anyone who isn't the expected user,
 * preventing "This interaction failed" from appearing for bystanders.
 */
export function onlyUser(userId: string) {
  return (i: MessageComponentInteraction): boolean => {
    if (i.user.id !== userId) {
      i.reply({ content: '❌ Đây không phải tương tác của bạn.', flags: 64 }).catch(() => {});
      return false;
    }
    return true;
  };
}

/**
 * Filter that allows any member of the given party (including the leader) to interact.
 * Non-party members receive an ephemeral rejection.
 */
export function onlyParty(leaderUserId: string, partyMemberIds: string[]) {
  const allowed = new Set([leaderUserId, ...partyMemberIds]);
  return (i: MessageComponentInteraction): boolean => {
    if (!allowed.has(i.user.id)) {
      i.reply({ content: '❌ Đây không phải tương tác của bạn.', flags: 64 }).catch(() => {});
      return false;
    }
    return true;
  };
}
