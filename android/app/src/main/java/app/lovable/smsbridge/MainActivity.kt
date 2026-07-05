package app.lovable.smsbridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.zxing.integration.android.IntentIntegrator
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var urlEt: EditText
    private lateinit var anonEt: EditText
    private lateinit var tokenEt: EditText
    private lateinit var delayEt: EditText
    private lateinit var pollEt: EditText
    private lateinit var enabledCb: CheckBox
    private lateinit var statusTv: TextView

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
            requestPerms()
            if (Config.enabled(this)) {
                SmsSyncService.start(this)
                status("Service started.")
            } else {
                SmsSyncService.stop(this)
                status("Saved (disabled).")
            }
        }

        stopBtn.setOnClickListener {
            SmsSyncService.stop(this)
            status("Service stopped.")
        }

        setContentView(root)
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

    private fun requestPerms() {
        val perms = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
        )
        if (Build.VERSION.SDK_INT >= 33) perms.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        if (missing.isNotEmpty()) ActivityCompat.requestPermissions(this, missing, 1)
    }
}
