package app.lovable.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class SmsInboundReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        if (!Config.enabled(ctx)) return

        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return

        // Group by originating address so multipart messages become one body
        val byAddress = msgs.groupBy { it.originatingAddress ?: "" }
        val api = ApiClient(ctx)
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                for ((addr, group) in byAddress) {
                    if (addr.isBlank()) continue
                    val body = group.joinToString("") { it.messageBody ?: "" }
                    try { api.postInbound(addr, body, iso) } catch (_: Exception) {}
                }
            } finally { pending.finish() }
        }
    }
}
