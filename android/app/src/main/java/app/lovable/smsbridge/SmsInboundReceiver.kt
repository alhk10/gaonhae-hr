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
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            InboundLog.append(ctx, "ignored action=${intent.action}")
            return
        }
        if (!Config.enabled(ctx)) {
            InboundLog.append(ctx, "SMS received but bridge is DISABLED - dropped")
            return
        }

        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (msgs == null) {
            InboundLog.append(ctx, "SMS_RECEIVED but getMessagesFromIntent returned null")
            return
        }

        val byAddress = msgs.groupBy { it.originatingAddress ?: "" }
        val api = ApiClient(ctx)
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                for ((addr, group) in byAddress) {
                    if (addr.isBlank()) {
                        InboundLog.append(ctx, "skipped blank originating address")
                        continue
                    }
                    val body = group.joinToString("") { it.messageBody ?: "" }
                    InboundLog.append(ctx, "SMS_RECEIVED from=$addr len=${body.length} posting…")
                    try {
                        api.postInbound(addr, body, iso)
                        InboundLog.append(ctx, "  -> OK forwarded from=$addr")
                    } catch (e: Exception) {
                        InboundLog.append(ctx, "  -> FAILED from=$addr err=${e.message}")
                    }
                }
            } finally { pending.finish() }
        }
    }
}
