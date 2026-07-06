package app.lovable.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Date
import java.util.LinkedHashMap
import java.util.Locale
import java.util.TimeZone

class SmsInboundReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        handle(ctx, intent, "manifest")
    }

    companion object {
        private const val DEDUPE_LIMIT = 40
        private val recentKeys = Collections.synchronizedMap(object : LinkedHashMap<String, Long>(DEDUPE_LIMIT, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>?): Boolean = size > DEDUPE_LIMIT
        })

        fun handle(ctx: Context, intent: Intent, source: String) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            InboundLog.append(ctx, "ignored action=${intent.action} source=$source")
            return
        }
        if (!Config.enabled(ctx)) {
            InboundLog.append(ctx, "SMS received source=$source but bridge is DISABLED - dropped")
            return
        }

        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (msgs == null) {
            InboundLog.append(ctx, "SMS_RECEIVED source=$source but getMessagesFromIntent returned null")
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
                        InboundLog.append(ctx, "skipped blank originating address source=$source")
                        continue
                    }
                    val body = group.joinToString("") { it.messageBody ?: "" }
                    val newestTimestamp = group.maxOfOrNull { it.timestampMillis } ?: 0L
                    val key = "$addr|$newestTimestamp|${body.hashCode()}"
                    synchronized(recentKeys) {
                        if (recentKeys.containsKey(key)) {
                            InboundLog.append(ctx, "SMS_RECEIVED duplicate ignored source=$source from=$addr len=${body.length}")
                            continue
                        }
                        recentKeys[key] = System.currentTimeMillis()
                    }
                    InboundLog.append(ctx, "SMS_RECEIVED source=$source from=$addr len=${body.length} posting…")
                    try {
                        api.postInbound(addr, body, iso)
                        InboundLog.append(ctx, "  -> OK forwarded source=$source from=$addr")
                    } catch (e: Exception) {
                        InboundLog.append(ctx, "  -> FAILED source=$source from=$addr err=${e.message}")
                    }
                }
            } finally { pending.finish() }
        }
        }
    }
}
