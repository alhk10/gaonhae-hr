import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';

interface NotificationOptInProps {
  compact?: boolean;
}

export function NotificationOptIn({ compact = false }: NotificationOptInProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = useNotificationSubscription();

  // Don't show anything if notifications aren't supported
  if (!isSupported) {
    if (compact) return null;
    
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Push notifications are not supported in this browser
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <>
            <Badge variant="secondary" className="gap-1">
              <Bell className="h-3 w-3" />
              Notifications On
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={unsubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={subscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Enable Reminders
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Push Notifications</CardTitle>
          </div>
          {isSubscribed && (
            <Badge variant="default" className="bg-green-500">Active</Badge>
          )}
        </div>
        <CardDescription>
          Get reminders to clock out, upcoming slots, and booking periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubscribed ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              You'll receive notifications for:
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Clock-out reminder after 5 hours</li>
                <li>Tomorrow's slot booking reminder at 9 PM</li>
                <li>Booking period reminders on the 14th & 28th</li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={unsubscribe}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              Disable Notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {permission === 'denied' ? (
              <div className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Enable notifications to receive timely reminders about your work schedule.
              </div>
            )}
            <Button
              onClick={subscribe}
              disabled={isLoading || permission === 'denied'}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Enable Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
