import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useXMPPStore } from '@/contexts/XMPPContext';

/**
 * Initializes push notification registration and listens for incoming
 * XMPP messages to fire local notifications when the chat is not active.
 *
 * Call this once near the root of the app (e.g. in App.tsx).
 */
export function useNotifications(navigate: (path: string) => void) {
  const status = useXMPPStore((s) => s.status);
  const initialized = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || initialized.current) return;
    if (status !== 'connected' && status !== 'authenticated') return;

    initialized.current = true;

    (async () => {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return;

      // Register with APNs / FCM
      await PushNotifications.register();

      // Log the device token (send this to your push server)
      PushNotifications.addListener('registration', (token) => {
        console.log('[Push] Device token:', token.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err);
      });

      // Handle push notification taps
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const jid = action.notification.data?.jid;
        const isRoom = action.notification.data?.isRoom;
        if (jid) {
          navigate(isRoom ? `/room/${jid}` : `/chat/${jid}`);
        }
      });

      // Handle local notification taps
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const jid = (action.notification.extra as any)?.jid;
        const isRoom = (action.notification.extra as any)?.isRoom;
        if (jid) {
          navigate(isRoom ? `/room/${jid}` : `/chat/${jid}`);
        }
      });
    })();

    return () => {
      PushNotifications.removeAllListeners();
      LocalNotifications.removeAllListeners();
    };
  }, [status, navigate]);
}

/**
 * Fire a local notification for an incoming message.
 * Call this from the XMPP message handlers.
 */
export async function showMessageNotification(opts: {
  title: string;
  body: string;
  jid: string;
  isRoom?: boolean;
}) {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Math.random() * 2147483647),
        title: opts.title,
        body: opts.body,
        extra: { jid: opts.jid, isRoom: opts.isRoom ?? false },
      },
    ],
  });
}
