import type { Message } from '@/contexts/XMPPContext';

/** Extract the local (username) part of a JID */
export function jidToLocal(jid: string): string {
  return jid.split('@')[0] ?? jid;
}

/** Format an ISO timestamp to a readable short time (HH:MM) */
export function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** True if `curr` should visually group with `prev` (same sender, within 2 min) */
export function shouldGroupMessages(
  prev: Message | undefined,
  curr: Message | undefined
): boolean {
  if (!prev || !curr) return false;
  if (prev.isMe !== curr.isMe) return false;
  const gap = new Date(curr.time).getTime() - new Date(prev.time).getTime();
  return gap < 2 * 60 * 1000;
}
