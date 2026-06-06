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
