package app.lovable.smsbridge

import android.Manifest
import android.app.ActivityManager
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.zxing.integration.android.IntentIntegrator
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainActivity : AppCompatActivity() {

    private lateinit var urlEt: EditText
    private lateinit var anonEt: EditText
    private lateinit var tokenEt: EditText
    private lateinit var delayEt: EditText
    private lateinit var pollEt: EditText
    private lateinit var enabledCb: CheckBox
    private lateinit var statusTv: TextView
    private lateinit var permTv: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = ScrollView(this)
        val ll = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        root.addView(ll)

        fun label(t: String) = TextView(this).apply { text = t; setPadding(0, 24, 0, 8) }
        fun editText(hint: String) = EditText(this).apply {
            this.hint = hint
            setSingleLine()
        }

        ll.addView(TextView(this).apply { text = "SMS Bridge"; textSize = 22f })

        val scanBtn = Button(this).apply { text = "Scan QR to pair" }
        ll.addView(scanBtn)

        ll.addView(label("Supabase URL"))
        urlEt = editText("https://xxx.supabase.co"); ll.addView(urlEt)
        ll.addView(label("Supabase anon key"))
        anonEt = editText("eyJ..."); ll.addView(anonEt)
        ll.addView(label("Device token (from webapp)"))
        tokenEt = editText(""); ll.addView(tokenEt)
        ll.addView(label("Send delay between messages (ms)"))
        delayEt = editText("3000").apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        ll.addView(delayEt)
        ll.addView(label("Poll interval (seconds, min 15)"))
        pollEt = editText("60").apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        ll.addView(pollEt)
        enabledCb = CheckBox(this).apply { text = "Enabled" }
        ll.addView(enabledCb)

        val saveBtn = Button(this).apply { text = "Save & Start" }
        val stopBtn = Button(this).apply { text = "Stop service" }
        ll.addView(saveBtn); ll.addView(stopBtn)

        permTv = TextView(this).apply { setPadding(0, 24, 0, 8); textSize = 12f }
        ll.addView(permTv)

        val requestPermsBtn = Button(this).apply { text = "Grant SMS permissions" }
        val openSettingsBtn = Button(this).apply { text = "Open app settings" }
        val viewLogBtn = Button(this).apply { text = "View inbound log" }
        val clearLogBtn = Button(this).apply { text = "Clear inbound log" }
        val testLogBtn = Button(this).apply { text = "Test inbound log" }
        val testForwardBtn = Button(this).apply { text = "Test forward inbound" }
        val scanInboxBtn = Button(this).apply { text = "Scan phone inbox now" }
        val rcsNoteTv = TextView(this).apply {
            text = "Note: only classic SMS can be forwarded. RCS/Chat messages (blue bubbles in Google Messages) are stored in a private database Android does not expose to third-party apps. Disable RCS on the sender for testing."
            textSize = 12f
            setPadding(0, 8, 0, 8)
        }
        ll.addView(requestPermsBtn); ll.addView(openSettingsBtn)
        ll.addView(viewLogBtn); ll.addView(clearLogBtn)
        ll.addView(testLogBtn); ll.addView(testForwardBtn); ll.addView(scanInboxBtn); ll.addView(rcsNoteTv)

        statusTv = TextView(this).apply { setPadding(0, 24, 0, 0) }
        ll.addView(statusTv)

        // Load
        urlEt.setText(Config.supabaseUrl(this))
        anonEt.setText(Config.anonKey(this))
        tokenEt.setText(Config.deviceToken(this))
        delayEt.setText(Config.sendDelayMs(this).toString())
        pollEt.setText(Config.pollIntervalSeconds(this).toString())
        enabledCb.isChecked = Config.enabled(this)

        scanBtn.setOnClickListener {
            ensureCameraPerm {
                IntentIntegrator(this).apply {
                    setOrientationLocked(true)
                    setBeepEnabled(false)
                    setPrompt("Scan pairing QR from SMS Bridge webapp")
                    setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                }.initiateScan()
            }
        }

        saveBtn.setOnClickListener {
            Config.save(
                this,
                urlEt.text.toString(),
                anonEt.text.toString(),
                tokenEt.text.toString(),
                delayEt.text.toString().toIntOrNull() ?: 3000,
                pollEt.text.toString().toIntOrNull() ?: 60,
                enabledCb.isChecked
            )
            InboundLog.append(this, "Save & Start tapped enabled=${enabledCb.isChecked}")
            requestPerms()
            if (Config.enabled(this)) {
                SmsSyncService.start(this)
                InboundLog.append(this, "foreground service start requested")
                runInboxScan("save-start")
                status("Service started.")
            } else {
                SmsSyncService.stop(this)
                InboundLog.append(this, "foreground service stop requested because disabled")
                status("Saved (disabled).")
            }
            refreshPermStatus()
        }

        stopBtn.setOnClickListener {
            SmsSyncService.stop(this)
            InboundLog.append(this, "Stop service tapped")
            status("Service stopped.")
        }

        requestPermsBtn.setOnClickListener { requestPerms() }

        openSettingsBtn.setOnClickListener {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
            }
            startActivity(intent)
        }

        viewLogBtn.setOnClickListener {
            val text = InboundLog.read(this)
            AlertDialog.Builder(this)
                .setTitle("Inbound SMS log (newest at bottom)")
                .setMessage(if (text.isBlank()) "(no entries yet — send a test SMS to this phone)" else text)
                .setPositiveButton("Close", null)
                .setNeutralButton("Copy") { _, _ ->
                    val cm = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    cm.setPrimaryClip(android.content.ClipData.newPlainText("inbound.log", text))
                    Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show()
                }
                .show()
        }

        clearLogBtn.setOnClickListener {
            InboundLog.clear(this)
            Toast.makeText(this, "Log cleared", Toast.LENGTH_SHORT).show()
        }

        testLogBtn.setOnClickListener {
            InboundLog.append(this, "manual local log test OK")
            Toast.makeText(this, "Wrote test log entry", Toast.LENGTH_SHORT).show()
        }

        testForwardBtn.setOnClickListener {
            runInboundForwardSelfTest()
        }

        scanInboxBtn.setOnClickListener {
            runInboxScan("manual-button")
        }

        setContentView(root)

        InboundLog.append(this, "app opened")
        // Force permission prompt on every launch
        requestPerms()
        refreshPermStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshPermStatus()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result != null) {
            val text = result.contents
            if (text.isNullOrBlank()) {
                super.onActivityResult(requestCode, resultCode, data)
                return
            }
            try {
                val j = JSONObject(text)
                urlEt.setText(j.optString("url"))
                anonEt.setText(j.optString("anon"))
                tokenEt.setText(j.optString("token"))
                if (j.has("delay")) delayEt.setText(j.optInt("delay", 3000).toString())
                enabledCb.isChecked = true
                Toast.makeText(this, "Paired. Tap Save & Start.", Toast.LENGTH_LONG).show()
                status("Scanned. Review fields and tap Save & Start.")
            } catch (e: Exception) {
                Toast.makeText(this, "Invalid QR: ${e.message}", Toast.LENGTH_LONG).show()
            }
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val resultText = permissions.mapIndexed { idx, perm ->
            val granted = grantResults.getOrNull(idx) == PackageManager.PERMISSION_GRANTED
            "${perm.substringAfterLast('.')}=${if (granted) "granted" else "denied"}"
        }.joinToString(", ")
        InboundLog.append(this, "permission result request=$requestCode $resultText")
        if (grantResults.any { it == PackageManager.PERMISSION_GRANTED }) runInboxScan("permission-result")
        refreshPermStatus()
    }

    private fun ensureCameraPerm(then: () -> Unit) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            then()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 2)
            Toast.makeText(this, "Grant camera permission, then tap Scan again.", Toast.LENGTH_LONG).show()
        }
    }

    private fun status(t: String) { statusTv.text = t }

    private fun granted(p: String) =
        ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun refreshPermStatus() {
        fun mark(p: String) = if (granted(p)) "✓" else "✗"
        val notif = if (Build.VERSION.SDK_INT >= 33) "  NOTIF ${mark(Manifest.permission.POST_NOTIFICATIONS)}" else ""
        permTv.text = "Permissions:  " +
            "SEND ${mark(Manifest.permission.SEND_SMS)}  " +
            "RECEIVE ${mark(Manifest.permission.RECEIVE_SMS)}  " +
            "READ ${mark(Manifest.permission.READ_SMS)}$notif" +
            "\nBridge enabled: ${if (Config.enabled(this)) "yes" else "no"}" +
            "  Service running: ${if (isBridgeServiceRunning()) "yes" else "no"}" +
            "\nInbox cursor: ts=${Config.inboundLastTimestamp(this)} id=${Config.inboundLastId(this)}"
    }

    @Suppress("DEPRECATION")
    private fun isBridgeServiceRunning(): Boolean {
        val manager = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        return manager.getRunningServices(Int.MAX_VALUE)
            .any { it.service.className == SmsSyncService::class.java.name }
    }

    private fun requestPerms() {
        val perms = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
        )
        if (Build.VERSION.SDK_INT >= 33) perms.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = perms.filter { !granted(it) }.toTypedArray()
        if (missing.isNotEmpty()) {
            InboundLog.append(this, "requesting permissions ${missing.joinToString { it.substringAfterLast('.') }}")
            ActivityCompat.requestPermissions(this, missing, 1)
        } else {
            InboundLog.append(this, "all SMS permissions already granted")
            if (Config.enabled(this)) runInboxScan("permissions-already-granted")
        }
    }

    private fun runInboxScan(source: String) {
        val ctx = applicationContext
        InboundLog.append(ctx, "manual inbox scan requested source=$source")
        Toast.makeText(this, "Scanning phone inbox…", Toast.LENGTH_SHORT).show()
        Thread {
            try {
                val result = SmsInboxScanner.scan(ctx, source)
                runOnUiThread {
                    refreshPermStatus()
                    val warning = result.warning
                    val message = if (warning != null) {
                        warning
                    } else {
                        "Inbox scan: checked ${result.checked}, forwarded ${result.forwarded}, failed ${result.failed}"
                    }
                    Toast.makeText(this, message.take(180), Toast.LENGTH_LONG).show()
                    status(message)
                }
            } catch (e: Exception) {
                InboundLog.append(ctx, "manual inbox scan FAILED source=$source err=${e.message}")
                runOnUiThread {
                    val message = "Inbox scan failed: ${e.message?.take(120)}"
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                    status(message)
                }
            }
        }.start()
    }

    private fun runInboundForwardSelfTest() {
        val ctx = applicationContext
        InboundLog.append(ctx, "manual forward self-test started")
        Toast.makeText(this, "Testing inbound forward…", Toast.LENGTH_SHORT).show()
        Thread {
            try {
                val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())
                ApiClient(ctx).postInbound("+6500000000", "SMS Bridge inbound self-test", iso)
                InboundLog.append(ctx, "manual forward self-test OK")
                runOnUiThread {
                    Toast.makeText(this, "Forward self-test OK", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                InboundLog.append(ctx, "manual forward self-test FAILED err=${e.message}")
                runOnUiThread {
                    Toast.makeText(this, "Forward self-test failed: ${e.message?.take(80)}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }
}
