package app.lovable.smsbridge

import android.app.*
import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Telephony
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import kotlin.coroutines.resume

class SmsSyncService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var api: ApiClient
    private var inboundReceiver: BroadcastReceiver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        InboundLog.append(applicationContext, "service onCreate")
        api = ApiClient(applicationContext)
        registerInboundReceiver()
        startForeground(NOTIF_ID, buildNotification("SMS Bridge active"))
        scope.launch { loop() }
    }

    override fun onDestroy() {
        InboundLog.append(applicationContext, "service onDestroy")
        unregisterInboundReceiver()
        scope.cancel()
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    private suspend fun loop() {
        while (scope.isActive) {
            var poll = Config.pollIntervalSeconds(applicationContext).coerceAtLeast(15)
            try {
                pollInboundInbox()
            } catch (e: Exception) {
                InboundLog.append(applicationContext, "inbox poll FAILED err=${e.message}")
            }
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

    private fun pollInboundInbox() {
        val ctx = applicationContext
        if (!Config.enabled(ctx)) {
            InboundLog.append(ctx, "inbox poll skipped because bridge is disabled")
            return
        }
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            InboundLog.append(ctx, "inbox poll skipped because READ_SMS is not granted")
            return
        }

        val lastTimestamp = Config.inboundLastTimestamp(ctx)
        val lastId = Config.inboundLastId(ctx)
        val firstRunLookbackMs = 15 * 60 * 1000L
        val retryLookbackMs = 5 * 60 * 1000L
        val since = if (lastTimestamp > 0L) {
            (lastTimestamp - retryLookbackMs).coerceAtLeast(0L)
        } else {
            (System.currentTimeMillis() - firstRunLookbackMs).coerceAtLeast(0L)
        }

        var checked = 0
        var forwarded = 0
        var skipped = 0
        var failed = 0
        var newestTimestamp = lastTimestamp
        var newestId = lastId

        val uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf("_id", "address", "body", "date")
        val cursor = ctx.contentResolver.query(
            uri,
            projection,
            "date >= ?",
            arrayOf(since.toString()),
            "date ASC, _id ASC"
        )

        cursor?.use {
            val idIdx = it.getColumnIndexOrThrow("_id")
            val addressIdx = it.getColumnIndexOrThrow("address")
            val bodyIdx = it.getColumnIndexOrThrow("body")
            val dateIdx = it.getColumnIndexOrThrow("date")
            while (it.moveToNext() && checked < 100) {
                checked++
                val id = it.getLong(idIdx)
                val address = it.getString(addressIdx) ?: ""
                val body = it.getString(bodyIdx) ?: ""
                val date = it.getLong(dateIdx)
                val key = SmsInboundReceiver.keyFor(address, date, body)

                if (Config.wasInboundProcessed(ctx, key)) {
                    skipped++
                    if (date > newestTimestamp || (date == newestTimestamp && id > newestId)) {
                        newestTimestamp = date
                        newestId = id
                    }
                    continue
                }

                val ok = SmsInboundReceiver.forwardInbound(ctx, "inbox", address, body, date)
                if (ok) {
                    forwarded++
                    if (date > newestTimestamp || (date == newestTimestamp && id > newestId)) {
                        newestTimestamp = date
                        newestId = id
                    }
                } else {
                    failed++
                }
            }
        } ?: run {
            InboundLog.append(ctx, "inbox poll returned no cursor")
            return
        }

        if (newestTimestamp > lastTimestamp || (newestTimestamp == lastTimestamp && newestId > lastId)) {
            Config.saveInboundCursor(ctx, newestTimestamp, newestId)
        }
        InboundLog.append(ctx, "inbox poll checked=$checked forwarded=$forwarded skipped=$skipped failed=$failed cursorTs=$newestTimestamp cursorId=$newestId")
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

    private fun registerInboundReceiver() {
        if (inboundReceiver != null) return
        inboundReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                SmsInboundReceiver.handle(context.applicationContext, intent, "service", goAsync())
            }
        }
        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply { priority = 1000 }
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                applicationContext.registerReceiver(inboundReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                applicationContext.registerReceiver(inboundReceiver, filter)
            }
            InboundLog.append(applicationContext, "dynamic inbound receiver registered")
        } catch (e: Exception) {
            InboundLog.append(applicationContext, "dynamic inbound receiver FAILED to register err=${e.message}")
            inboundReceiver = null
        }
    }

    private fun unregisterInboundReceiver() {
        val receiver = inboundReceiver ?: return
        try {
            applicationContext.unregisterReceiver(receiver)
            InboundLog.append(applicationContext, "dynamic inbound receiver unregistered")
        } catch (e: Exception) {
            InboundLog.append(applicationContext, "dynamic inbound receiver unregister ignored err=${e.message}")
        } finally {
            inboundReceiver = null
        }
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
