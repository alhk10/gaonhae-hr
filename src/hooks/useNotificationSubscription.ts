import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkExistingSubscription
} from '@/services/pushNotificationService';
import { toast } from 'sonner';

interface UseNotificationSubscriptionReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export const useNotificationSubscription = (): UseNotificationSubscriptionReturn => {
  const { userDetails } = useAuth();
  const employeeId = userDetails?.id;
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check support and current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      
      const supported = isPushNotificationSupported();
      setIsSupported(supported);
      
      if (supported) {
        setPermission(getNotificationPermission());
        
        if (employeeId) {
          const subscribed = await checkExistingSubscription(employeeId);
          setIsSubscribed(subscribed);
        }
      }
      
      setIsLoading(false);
    };

    checkStatus();
  }, [employeeId]);

  const subscribe = useCallback(async () => {
    if (!employeeId) {
      toast.error('Please log in to enable notifications');
      return;
    }

    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      await subscribeToPushNotifications(employeeId);
      setIsSubscribed(true);
      setPermission(getNotificationPermission());
      toast.success('Notifications enabled successfully!');
    } catch (error: any) {
      console.error('Subscription error:', error);
      if (error.message === 'Notification permission denied') {
        toast.error('Please allow notifications in your browser settings');
      } else {
        toast.error('Failed to enable notifications');
      }
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!employeeId) {
      return;
    }

    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications(employeeId);
      setIsSubscribed(false);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
};
