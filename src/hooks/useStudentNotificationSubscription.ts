 import { useState, useEffect, useCallback } from 'react';
 import {
   isPushNotificationSupported,
   getNotificationPermission,
   subscribeStudentToPushNotifications,
   unsubscribeStudentFromPushNotifications,
   checkStudentExistingSubscription
 } from '@/services/studentPushNotificationService';
 import { toast } from 'sonner';
 
 interface UseStudentNotificationSubscriptionReturn {
   isSupported: boolean;
   permission: NotificationPermission;
   isSubscribed: boolean;
   isLoading: boolean;
   subscribe: () => Promise<void>;
   unsubscribe: () => Promise<void>;
 }
 
 export const useStudentNotificationSubscription = (
   studentId: string | undefined
 ): UseStudentNotificationSubscriptionReturn => {
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
         
         if (studentId) {
           const subscribed = await checkStudentExistingSubscription(studentId);
           setIsSubscribed(subscribed);
         }
       }
       
       setIsLoading(false);
     };
 
     checkStatus();
   }, [studentId]);
 
   const subscribe = useCallback(async () => {
     if (!studentId) {
       toast.error('Please log in to enable notifications');
       return;
     }
 
     if (!isSupported) {
       toast.error('Push notifications are not supported in this browser');
       return;
     }
 
     setIsLoading(true);
     try {
       await subscribeStudentToPushNotifications(studentId);
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
   }, [studentId, isSupported]);
 
   const unsubscribe = useCallback(async () => {
     if (!studentId) {
       return;
     }
 
     setIsLoading(true);
     try {
       await unsubscribeStudentFromPushNotifications(studentId);
       setIsSubscribed(false);
       toast.success('Notifications disabled');
     } catch (error) {
       console.error('Unsubscribe error:', error);
       toast.error('Failed to disable notifications');
     } finally {
       setIsLoading(false);
     }
   }, [studentId]);
 
   return {
     isSupported,
     permission,
     isSubscribed,
     isLoading,
     subscribe,
     unsubscribe
   };
 };