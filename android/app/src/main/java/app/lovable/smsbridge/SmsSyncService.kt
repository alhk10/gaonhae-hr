package app.lovable.smsbridge

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlin.coroutines.resume

class SmsSyncService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var api: ApiClient

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        api = ApiClient(applicationContext)
        startForeground(NOTIF_ID, buildNotification("SMS Bridge active"))
        scope.launch { loop() }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    private suspend fun loop() {
        while (scope.isActive) {
            var poll = Config.pollIntervalSeconds(applicationContext).coerceAtLeast(15)
            try {
                val result = api.fetchPending()
                Config.updateFromServer(applicationContext, result.sendDelayMs, result.pollIntervalSeconds)
                poll = result.pollIntervalSeconds.coerceAtLeast(15)
                if (result.messages.isNotEmpty()) {
                    updateNotification("Sending ${result.messages.size} SMS…")
                    for ((idx, m) in result.messages.withIndex()) {
                        sendOne(m)
                        if (idx != result.messages.lastIndex) {
                            // Enforce delay between messages
                            delay(result.sendDelayMs.toLong())
                        }
                    }
                    updateNotification("SMS Bridge active")
                }
            } catch (e: Exception) {
                updateNotification("Error: ${e.message?.take(60)}")
            }
            delay(poll * 1000L)
        }
    }

    private suspend fun sendOne(m: OutboundMessage) {
        val ctx = applicationContext
        val sentAction = "app.lovable.smsbridge.SMS_SENT_${m.id}"

        val result: Int = withTimeoutOrNull(30_000L) {
            suspendCancellableCoroutine<Int> { cont ->
                val recv = object : android.content.BroadcastReceiver() {
                    override fun onReceive(c: Context?, i: Intent?) {
                        try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
                        if (cont.isActive) cont.resume(resultCode)
                    }
                }
                val filter = IntentFilter(sentAction)
                if (Build.VERSION.SDK_INT >= 33) {
                    ctx.registerReceiver(recv, filter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    @Suppress("UnspecifiedRegisterReceiverFlag")
                    ctx.registerReceiver(recv, filter)
                }
                cont.invokeOnCancellation {
                    try { ctx.unregisterReceiver(recv) } catch (_: Exception) {}
                }

                val sentIntent = Intent(sentAction).setPackage(packageName)
                val pi = PendingIntent.getBroadcast(
                    ctx, m.id.hashCode(), sentIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )

                try {
                    val sm = if (Build.VERSION.SDK_INT >= 31)
                        ctx.getSystemService(SmsManager::class.java)
                    else @Suppress("DEPRECATION") SmsManager.getDefault()

                    val parts = sm.divideMessage(m.body)
                    if (parts.size > 1) {
                        val piList = ArrayList<PendingIntent>().apply { repeat(parts.size) { add(pi) } }
                        sm.sendMultipartTextMessage(m.phone, null, parts, piList, null)
                    } else {
                        sm.sendTextMessage(m.phone, null, m.body, pi, null)
                    }
                } catch (e: Exception) {
                    try { ctx.unregisterReceiver(recv) } catch (_: Exception) {}
                    if (cont.isActive) cont.resume(Activity.RESULT_CANCELED)
                }
            }
        } ?: Activity.RESULT_CANCELED

        val ok = result == Activity.RESULT_OK
        try {
            api.reportStatus(m.id, if (ok) "sent" else "failed", if (ok) null else "resultCode=$result")
        } catch (_: Exception) {}
    }

    private fun buildNotification(text: String): Notification {
        val channelId = "sms_bridge"
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(channelId) == null) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "SMS Bridge", NotificationManager.IMPORTANCE_LOW)
            )
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("SMS Bridge")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    companion object {
        private const val NOTIF_ID = 42

        fun start(ctx: Context) {
            val i = Intent(ctx, SmsSyncService::class.java)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }

        fun stop(ctx: Context) { ctx.stopService(Intent(ctx, SmsSyncService::class.java)) }
    }
}
