import { useShallow } from 'zustand/react/shallow';
import { useXMPPStore } from '@/contexts/XMPPContext';

/** General connection state + actions */
export function useXMPP() {
  return useXMPPStore(
    useShallow((s) => ({
      status: s.status,
      myJid: s.myJid,
      error: s.error,
      connect: s.connect,
      disconnect: s.disconnect,
    }))
  );
}

/** All roster contacts */
export function useRoster() {
  return useXMPPStore((s) => s.contacts);
}

/** Active chat JID + actions */
export function useActiveChat() {
  return useXMPPStore(
    useShallow((s) => ({
      activeChatJid: s.activeChatJid,
      setActiveChat: s.setActiveChat,
      markRead: s.markRead,
    }))
  );
}

const EMPTY_MESSAGES: import('@/contexts/XMPPContext').Message[] = [];

/** Messages for a specific JID */
export function useChat(jid: string | null) {
  const messages = useXMPPStore((s) => s.messages);
  return jid ? (messages[jid] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES;
}

/** sendMessage action */
export function useSendMessage() {
  return useXMPPStore((s) => s.sendMessage);
}

/** fetchMessages action */
export function useFetchMessages() {
  return useXMPPStore((s) => s.fetchMessages);
}

/** All joined rooms */
export function useRooms() {
  return useXMPPStore((s) => s.rooms);
}

/** Room actions */
export function useRoomActions() {
  return useXMPPStore(
    useShallow((s) => ({
      joinRoom: s.joinRoom,
      leaveRoom: s.leaveRoom,
      createRoom: s.createRoom,
      sendRoomMessage: s.sendRoomMessage,
      fetchRoomMessages: s.fetchRoomMessages,
      getRoomOccupants: s.getRoomOccupants,
    }))
  );
}
