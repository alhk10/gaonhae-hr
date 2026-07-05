package app.lovable.smsbridge

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object Config {
    private const val FILE = "sms_bridge_prefs"

    fun prefs(ctx: Context): android.content.SharedPreferences {
        val key = MasterKey.Builder(ctx)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            ctx, FILE, key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun supabaseUrl(ctx: Context) = prefs(ctx).getString("supabase_url", "") ?: ""
    fun anonKey(ctx: Context) = prefs(ctx).getString("anon_key", "") ?: ""
    fun deviceToken(ctx: Context) = prefs(ctx).getString("device_token", "") ?: ""
    fun sendDelayMs(ctx: Context) = prefs(ctx).getInt("send_delay_ms", 3000)
    fun pollIntervalSeconds(ctx: Context) = prefs(ctx).getInt("poll_interval_seconds", 60)
    fun enabled(ctx: Context) = prefs(ctx).getBoolean("enabled", false)

    fun save(
        ctx: Context,
        url: String, anonKey: String, token: String,
        delayMs: Int, pollSeconds: Int, enabled: Boolean
    ) {
        prefs(ctx).edit()
            .putString("supabase_url", url.trimEnd('/'))
            .putString("anon_key", anonKey.trim())
            .putString("device_token", token.trim())
            .putInt("send_delay_ms", delayMs.coerceAtLeast(0))
            .putInt("poll_interval_seconds", pollSeconds.coerceAtLeast(15))
            .putBoolean("enabled", enabled)
            .apply()
    }

    fun updateFromServer(ctx: Context, delayMs: Int, pollSeconds: Int) {
        prefs(ctx).edit()
            .putInt("send_delay_ms", delayMs)
            .putInt("poll_interval_seconds", pollSeconds)
            .apply()
    }
}
