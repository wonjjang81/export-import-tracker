import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PushNotificationSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 브라우저가 웹 푸시를 지원하는지 확인
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    // 현재 구독 상태 확인
    if (supported) {
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Service Worker 등록
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      // 푸시 권한 요청
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('푸시 알림 권한이 거부되었습니다');
        setIsLoading(false);
        return;
      }

      // 푸시 구독
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      // 서버에 구독 정보 저장
      const response = await fetch('/api/trpc/notifications.subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushSubscription: subscription.toJSON(),
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success('푸시 알림 구독이 완료되었습니다');
      } else {
        toast.error('구독 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('푸시 알림 구독 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // 서버에서 구독 정보 제거
        await fetch('/api/trpc/notifications.unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        setIsSubscribed(false);
        toast.success('푸시 알림 구독이 취소되었습니다');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('구독 취소 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            푸시 알림 미지원
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            이 브라우저는 웹 푸시 알림을 지원하지 않습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          푸시 알림 설정
        </CardTitle>
        <CardDescription>
          분석 완료 시 실시간 알림을 받으세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isSubscribed
              ? '푸시 알림이 활성화되어 있습니다. 분석이 완료되면 알림을 받게 됩니다.'
              : '푸시 알림을 활성화하면 분석 완료 시 실시간 알림을 받을 수 있습니다.'}
          </p>
          <Button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            variant={isSubscribed ? 'destructive' : 'default'}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubscribed ? '구독 취소' : '알림 구독'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// VAPID 공개 키를 Uint8Array로 변환
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
