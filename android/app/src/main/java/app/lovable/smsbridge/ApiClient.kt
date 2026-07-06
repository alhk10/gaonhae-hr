package app.lovable.smsbridge

import android.content.Context
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class OutboundMessage(val id: String, val phone: String, val body: String)

data class FetchResult(
    val messages: List<OutboundMessage>,
    val sendDelayMs: Int,
    val pollIntervalSeconds: Int
)

class ApiClient(private val ctx: Context) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private fun urlFor(path: String) = "${Config.supabaseUrl(ctx)}/functions/v1$path"

    private fun requestBuilder(path: String): Request.Builder {
        return Request.Builder()
            .url(urlFor(path))
            .addHeader("Authorization", "Bearer ${Config.deviceToken(ctx)}")
            .addHeader("apikey", Config.anonKey(ctx))
    }

    fun fetchPending(limit: Int = 20): FetchResult {
        val req = requestBuilder("/sms-fetch-pending?limit=$limit").get().build()
        client.newCall(req).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) throw RuntimeException("fetch-pending ${resp.code}: $body")
            val j = JSONObject(body)
            val arr = j.optJSONArray("messages") ?: JSONArray()
            val list = mutableListOf<OutboundMessage>()
            for (i in 0 until arr.length()) {
                val m = arr.getJSONObject(i)
                list.add(OutboundMessage(m.getString("id"), m.getString("phone"), m.getString("body")))
            }
            return FetchResult(
                list,
                j.optInt("send_delay_ms", 3000),
                j.optInt("poll_interval_seconds", 60)
            )
        }
    }

    fun reportStatus(outboundId: String, status: String, error: String? = null) {
        val payload = JSONObject().apply {
            put("outbound_id", outboundId)
            put("status", status)
            if (error != null) put("error", error)
        }
        val req = requestBuilder("/sms-report-status")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(req).execute().use { }
    }

    fun postInbound(phone: String, body: String, receivedAtIso: String) {
        val payload = JSONObject().apply {
            put("phone", phone)
            put("body", body)
            put("received_at", receivedAtIso)
        }
        val req = requestBuilder("/sms-inbound")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                val err = resp.body?.string().orEmpty().take(300)
                throw RuntimeException("sms-inbound ${resp.code}: $err")
            }
        }
    }
}
