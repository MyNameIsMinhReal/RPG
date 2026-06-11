import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const SHOP_BATCH_AMOUNTS = [1, 5, 10] as const;
export type ShopBatchKind = 'item' | 'eq';

export interface BatchBuyIdParts {
  leaderId: string;
  actorId: string;
  kind: ShopBatchKind;
  itemId: string;
  qty: number;
}

export function makeBatchBuyId(prefix: string, leaderId: string, actorId: string, kind: ShopBatchKind, itemId: string, qty: number): string {
  return `${prefix}:${leaderId}:${actorId}:${kind}:${itemId}:${qty}`;
}

export function parseBatchBuyId(customId: string, prefix: string): BatchBuyIdParts | null {
  const parts = customId.split(':');
  if (parts.length !== 6 || parts[0] !== prefix) return null;
  const [, leaderId, actorId, kind, itemId, qtyRaw] = parts;
  if (kind !== 'item' && kind !== 'eq') return null;
  const qty = Number.parseInt(qtyRaw, 10);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return { leaderId, actorId, kind, itemId, qty };
}

export function batchTotal(unitPrice: number, qty: number): number {
  return Math.max(1, unitPrice) * Math.max(1, qty);
}

export function buildBatchBuyRow(params: {
  prefix: string;
  leaderId: string;
  actorId: string;
  kind: ShopBatchKind;
  itemId: string;
  unitPrice: number;
  actorGold: number;
  cancelCustomId: string;
  customQtyCustomId?: string;
}): ActionRowBuilder<ButtonBuilder> {
  const isEquipment = params.kind === 'eq';
  const amounts = isEquipment ? [1] : [...SHOP_BATCH_AMOUNTS];

  const buttons = amounts.map(qty => {
    const total = batchTotal(params.unitPrice, qty);
    return new ButtonBuilder()
      .setCustomId(makeBatchBuyId(params.prefix, params.leaderId, params.actorId, params.kind, params.itemId, qty))
      .setLabel(isEquipment ? `Mua` : `Mua x${qty}`)
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Success)
      .setDisabled(params.actorGold < total);
  });

  if (!isEquipment && params.customQtyCustomId) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(params.customQtyCustomId)
        .setLabel('Nhập số lượng')
        .setEmoji('🔢')
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(params.cancelCustomId)
      .setLabel('Hủy')
      .setStyle(ButtonStyle.Secondary)
  );

  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(0, 5));
}

export function parsePositiveQuantity(raw: string, max = 999): number | null {
  const cleaned = String(raw ?? '').trim().replace(/[, ]+/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const qty = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return Math.min(qty, max);
}

export function formatBatchCost(unitPrice: number, qty: number): string {
  return qty <= 1 ? `${unitPrice} 🪙` : `${unitPrice} × ${qty} = ${batchTotal(unitPrice, qty)} 🪙`;
}
