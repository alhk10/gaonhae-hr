 import { supabase } from "@/integrations/supabase/client";
 
 // VAPID public key - must match the VAPID_PUBLIC_KEY secret in Supabase
 // This is a publishable key and safe to include in client code
 const VAPID_PUBLIC_KEY = 'BBTNSFPKoWdq0Q_PVNwkTSKfMR0IFJHkVSYnW1oDPR8UVo9IVzJDBFJFMCYvuVg_n7r5c0qQ0WFHThvB1nZxQ8E';
 
 export interface PushSubscriptionData {
   endpoint: string;
   p256dh: string;
   auth: string;
 }
 
 export const isPushNotificationSupported = (): boolean => {
   return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
 };
 
 export const getNotificationPermission = (): NotificationPermission => {
   if (!('Notification' in window)) {
     return 'denied';
   }
   return Notification.permission;
 };
 
 export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
   if (!('Notification' in window)) {
     console.warn('Notifications not supported');
     return 'denied';
   }
   
   const permission = await Notification.requestPermission();
   console.log('Notification permission:', permission);
   return permission;
 };
 
 export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
   if (!('serviceWorker' in navigator)) {
     console.warn('Service workers not supported');
     return null;
   }
 
   try {
     const registration = await navigator.serviceWorker.register('/sw.js', {
       scope: '/'
     });
     console.log('Service worker registered:', registration);
     return registration;
   } catch (error) {
     console.error('Service worker registration failed:', error);
     return null;
   }
 };
 
 // Helper function to convert VAPID key
 function urlBase64ToUint8Array(base64String: string): Uint8Array {
   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
   const base64 = (base64String + padding)
     .replace(/-/g, '+')
     .replace(/_/g, '/');
 
   const rawData = window.atob(base64);
   const outputArray = new Uint8Array(rawData.length);
 
   for (let i = 0; i < rawData.length; ++i) {
     outputArray[i] = rawData.charCodeAt(i);
   }
   return outputArray;
 }
 
 export const subscribeStudentToPushNotifications = async (
   studentId: string
 ): Promise<PushSubscriptionData | null> => {
   try {
     // First, register service worker
     const registration = await registerServiceWorker();
     if (!registration) {
       throw new Error('Service worker registration failed');
     }
 
     // Request permission
     const permission = await requestNotificationPermission();
     if (permission !== 'granted') {
       throw new Error('Notification permission denied');
     }
 
     // Wait for service worker to be ready
     await navigator.serviceWorker.ready;
 
     // Subscribe to push notifications
     const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
     const subscription = await registration.pushManager.subscribe({
       userVisibleOnly: true,
       applicationServerKey: applicationServerKey as BufferSource
     });
 
     const subscriptionJSON = subscription.toJSON();
     const subscriptionData: PushSubscriptionData = {
       endpoint: subscriptionJSON.endpoint!,
       p256dh: subscriptionJSON.keys!.p256dh,
       auth: subscriptionJSON.keys!.auth
     };
 
     // Save subscription to database
     const { error } = await supabase
       .from('student_notification_subscriptions')
       .upsert({
         student_id: studentId,
         endpoint: subscriptionData.endpoint,
         p256dh: subscriptionData.p256dh,
         auth: subscriptionData.auth,
         user_agent: navigator.userAgent
       }, {
         onConflict: 'student_id,endpoint'
       });
 
     if (error) {
       console.error('Error saving student subscription:', error);
       throw error;
     }
 
     console.log('Student push subscription saved successfully');
     return subscriptionData;
   } catch (error) {
     console.error('Error subscribing student to push notifications:', error);
     throw error;
   }
 };
 
 export const unsubscribeStudentFromPushNotifications = async (
   studentId: string
 ): Promise<boolean> => {
   try {
     const registration = await navigator.serviceWorker.ready;
     const subscription = await registration.pushManager.getSubscription();
 
     if (subscription) {
       await subscription.unsubscribe();
     }
 
     // Remove from database
     const { error } = await supabase
       .from('student_notification_subscriptions')
       .delete()
       .eq('student_id', studentId);
 
     if (error) {
       console.error('Error removing student subscription:', error);
       throw error;
     }
 
     console.log('Student push subscription removed successfully');
     return true;
   } catch (error) {
     console.error('Error unsubscribing student from push notifications:', error);
     throw error;
   }
 };
 
 export const checkStudentExistingSubscription = async (
   studentId: string
 ): Promise<boolean> => {
   try {
     const { data, error } = await supabase
       .from('student_notification_subscriptions')
       .select('id')
       .eq('student_id', studentId)
       .maybeSingle();
 
     if (error) {
       console.error('Error checking student subscription:', error);
       return false;
     }
 
     return !!data;
   } catch (error) {
     console.error('Error checking student subscription:', error);
     return false;
   }
 };