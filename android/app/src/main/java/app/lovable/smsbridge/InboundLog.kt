package app.lovable.smsbridge

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object InboundLog {
    private const val FILE_NAME = "inbound.log"
    private const val MAX_BYTES = 64 * 1024

    @Synchronized
    fun append(ctx: Context, line: String) {
        try {
            val f = File(ctx.filesDir, FILE_NAME)
            val ts = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
            f.appendText("[$ts] $line\n")
            if (f.length() > MAX_BYTES) {
                val text = f.readText()
                val trimmed = text.takeLast(MAX_BYTES / 2)
                f.writeText(trimmed)
            }
        } catch (_: Exception) {}
    }

    fun read(ctx: Context): String {
        val f = File(ctx.filesDir, FILE_NAME)
        if (!f.exists()) return "(empty)"
        return try { f.readText() } catch (e: Exception) { "read error: ${e.message}" }
    }

    fun clear(ctx: Context) {
        try { File(ctx.filesDir, FILE_NAME).delete() } catch (_: Exception) {}
    }
}
