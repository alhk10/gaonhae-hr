package app.lovable.smsbridge

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat

data class InboxScanResult(
    val checked: Int,
    val forwarded: Int,
    val skipped: Int,
    val failed: Int,
    val newestTimestamp: Long,
    val newestId: Long,
    val warning: String? = null,
)

object SmsInboxScanner {
    private const val DEFAULT_MAX_ROWS = 50
    private const val FIRST_RUN_MAX_AGE_MS = 24 * 60 * 60 * 1000L

    fun scan(ctx: Context, source: String, maxRows: Int = DEFAULT_MAX_ROWS): InboxScanResult {
        if (!Config.enabled(ctx)) {
            val warning = "inbox scan skipped because bridge is disabled"
            InboundLog.append(ctx, warning)
            return InboxScanResult(0, 0, 0, 0, Config.inboundLastTimestamp(ctx), Config.inboundLastId(ctx), warning)
        }
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            val warning = "inbox scan skipped because READ_SMS is not granted"
            InboundLog.append(ctx, warning)
            return InboxScanResult(0, 0, 0, 0, Config.inboundLastTimestamp(ctx), Config.inboundLastId(ctx), warning)
        }

        val lastTimestamp = Config.inboundLastTimestamp(ctx)
        val lastId = Config.inboundLastId(ctx)
        val minDate = (System.currentTimeMillis() - FIRST_RUN_MAX_AGE_MS).coerceAtLeast(0L)
        var checked = 0
        var forwarded = 0
        var skipped = 0
        var failed = 0
        var newestTimestamp = lastTimestamp
        var newestId = lastId
        var rowsSeen = 0
        var newRows = 0

        val cursor = ctx.contentResolver.query(
            Uri.parse("content://sms/inbox"),
            arrayOf("_id", "address", "body", "date"),
            null,
            null,
            "date DESC, _id DESC"
        )

        cursor?.use {
            val idIdx = it.getColumnIndexOrThrow("_id")
            val addressIdx = it.getColumnIndexOrThrow("address")
            val bodyIdx = it.getColumnIndexOrThrow("body")
            val dateIdx = it.getColumnIndexOrThrow("date")
            while (it.moveToNext() && checked < maxRows) {
                checked++
                rowsSeen++
                val id = it.getLong(idIdx)
                val address = it.getString(addressIdx) ?: ""
                val body = it.getString(bodyIdx) ?: ""
                val date = it.getLong(dateIdx)
                val key = SmsInboundReceiver.keyFor(address, date, body)
                val ageOk = date >= minDate

                InboundLog.append(ctx, "inbox candidate source=$source id=$id date=$date from=$address len=${body.length}")

                if (date > newestTimestamp || (date == newestTimestamp && id > newestId)) {
                    newestTimestamp = date
                    newestId = id
                }

                if (!ageOk) {
                    skipped++
                    InboundLog.append(ctx, "inbox candidate skipped old source=$source id=$id")
                    continue
                }

                if (Config.wasInboundProcessed(ctx, key)) {
                    skipped++
                    InboundLog.append(ctx, "inbox candidate already processed source=$source id=$id")
                    continue
                }

                val ok = SmsInboundReceiver.forwardInbound(ctx, source, address, body, date)
                if (ok) forwarded++ else failed++
            }
        } ?: run {
            val warning = "inbox scan returned no cursor"
            InboundLog.append(ctx, warning)
            return InboxScanResult(0, 0, 0, 0, lastTimestamp, lastId, warning)
        }

        if (newestTimestamp > lastTimestamp || (newestTimestamp == lastTimestamp && newestId > lastId)) {
            Config.saveInboundCursor(ctx, newestTimestamp, newestId)
        }

        val noRowsWarning = if (rowsSeen == 0) {
            "No SMS rows found in Android inbox. If the message appears in your chat app, it may be RCS/chat and not carrier SMS."
        } else null
        if (noRowsWarning != null) InboundLog.append(ctx, noRowsWarning)

        InboundLog.append(ctx, "inbox scan source=$source checked=$checked forwarded=$forwarded skipped=$skipped failed=$failed cursorTs=$newestTimestamp cursorId=$newestId")
        return InboxScanResult(checked, forwarded, skipped, failed, newestTimestamp, newestId, noRowsWarning)
    }
}