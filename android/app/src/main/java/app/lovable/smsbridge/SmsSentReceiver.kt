package app.lovable.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Placeholder — sent results are captured by dynamic receivers registered in SmsSyncService.
// Kept declared for manifest completeness; safe to remove.
class SmsSentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) { /* no-op */ }
}
