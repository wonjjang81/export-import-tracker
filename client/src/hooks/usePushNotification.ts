import { useEffect, useState, useCallback } from 'react';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

export function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // 초기화: Service Worker 등록 및 푸시 구독 상태 확인
  useEffect(() => {
    // 브라우저 지원 확인
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      console.warn('[usePushNotification] Push notifications not supported');
      return;
    }

    // Service Worker 등록
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[usePushNotification] Service Worker registered:', registration);
        
        // 기존 구독 확인
        return registration.pushManager.getSubscription();
      })
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
          console.log('[usePushNotification] Already subscribed to push notifications');
        }
      })
      .catch((error) => {
        console.error('[usePushNotification] Error registering Service Worker:', error);
      });
  }, []);

  // 푸시 구독 요청
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      console.warn('[usePushNotification] Push notifications not supported');
      return false;
    }

    try {
      // 알림 권한 요청
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('[usePushNotification] Notification permission denied');
          return false;
        }
      } else if (Notification.permission === 'denied') {
        console.warn('[usePushNotification] Notification permission denied');
        return false;
      }

      // Service Worker 가져오기
      const registration = await navigator.serviceWorker.ready;
      
      // 푸시 구독
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // 실제 배포 시 VAPID 공개 키 필요
        // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);
      setIsSubscribed(true);
      console.log('[usePushNotification] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[usePushNotification] Error subscribing to push notifications:', error);
      return false;
    }
  }, [isSupported]);

  // 푸시 구독 취소
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      return false;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      console.log('[usePushNotification] Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('[usePushNotification] Error unsubscribing from push notifications:', error);
      return false;
    }
  }, [subscription]);

  // 로컬 알림 표시 (개발/테스트용)
  const showLocalNotification = useCallback(async (options: PushNotificationOptions) => {
    if (!isSupported) {
      console.warn('[usePushNotification] Notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/manus-logo.png',
        badge: options.badge || '/manus-badge.png',
        tag: options.tag || 'export-import-notification',
        requireInteraction: options.requireInteraction || false,
        data: options.data || {},
      });
    } catch (error) {
      console.error('[usePushNotification] Error showing notification:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    subscribe,
    unsubscribe,
    showLocalNotification,
  };
}
