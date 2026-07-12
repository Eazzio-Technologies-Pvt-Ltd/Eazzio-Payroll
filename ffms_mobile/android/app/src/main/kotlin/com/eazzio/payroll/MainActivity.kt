package com.eazzio.payroll

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.eazzio.payroll/device_settings"
    private val ALARM_CHANNEL = "com.eazzio.payroll/alarm_notifications"
    private var pendingAudioResult: MethodChannel.Result? = null
    private val PICK_AUDIO_REQUEST_CODE = 999

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // General settings method channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openAutostartSettings" -> {
                    val success = openAutostartSettings()
                    result.success(success)
                }
                "openBatteryOptimizationSettings" -> {
                    val success = openBatteryOptimizationSettings()
                    result.success(success)
                }

                else -> {
                    result.notImplemented()
                }
            }
        }

        // Alarm specific method channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, ALARM_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "scheduleAlarm" -> {
                    val timeInMillis = call.argument<Long>("timeInMillis") ?: 0L
                    val isPunchIn = call.argument<Boolean>("isPunchIn") ?: true
                    val customTunePath = call.argument<String>("customTunePath")
                    val success = scheduleAlarm(timeInMillis, isPunchIn, customTunePath)
                    result.success(success)
                }
                "cancelAlarm" -> {
                    val isPunchIn = call.argument<Boolean>("isPunchIn") ?: true
                    val success = cancelAlarm(isPunchIn)
                    result.success(success)
                }
                "stopActiveAlarm" -> {
                    val success = stopActiveAlarm()
                    result.success(success)
                }
                "isDndAccessGranted" -> {
                    val granted = isDndAccessGranted()
                    result.success(granted)
                }
                "requestDndAccess" -> {
                    val success = requestDndAccess()
                    result.success(success)
                }
                "isBatteryOptimizationIgnored" -> {
                    val ignored = isBatteryOptimizationIgnored()
                    result.success(ignored)
                }
                "pickAudioFile" -> {
                    pendingAudioResult = result
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "audio/*"
                    }
                    startActivityForResult(intent, PICK_AUDIO_REQUEST_CODE)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_AUDIO_REQUEST_CODE) {
            val result = pendingAudioResult
            pendingAudioResult = null

            if (resultCode == RESULT_OK && data != null && data.data != null) {
                val uri = data.data!!
                val persistentPath = copyAudioToInternalStorage(uri)
                if (persistentPath != null) {
                    result?.success(persistentPath)
                } else {
                    result?.error("COPY_FAIL", "Failed to copy file to internal storage", null)
                }
            } else {
                result?.success(null)
            }
        }
    }

    private fun copyAudioToInternalStorage(uri: Uri): String? {
        try {
            val returnCursor = contentResolver.query(uri, null, null, null, null)
            val nameIndex = returnCursor?.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            returnCursor?.moveToFirst()
            val fileName = nameIndex?.let { returnCursor.getString(it) } ?: "custom_tone_${System.currentTimeMillis()}.mp3"
            returnCursor?.close()

            val outputDir = File(filesDir, "custom_alarms")
            if (!outputDir.exists()) {
                outputDir.mkdirs()
            }
            val destinationFile = File(outputDir, fileName)

            contentResolver.openInputStream(uri)?.use { inputStream ->
                FileOutputStream(destinationFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
            Log.d("MainActivity", "Successfully copied picked audio to ${destinationFile.absolutePath}")
            return destinationFile.absolutePath
        } catch (e: Exception) {
            Log.e("MainActivity", "Error copying audio to internal storage", e)
            return null
        }
    }

    private fun scheduleAlarm(timeInMillis: Long, isPunchIn: Boolean, customTunePath: String?): Boolean {
        try {
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(this, AlarmReceiver::class.java).apply {
                putExtra("isPunchIn", isPunchIn)
                putExtra("customTunePath", customTunePath)
            }
            val requestCode = if (isPunchIn) 1001 else 1002
            val pendingIntent = PendingIntent.getBroadcast(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            // Cancel any pre-existing alarm for this request code first
            alarmManager.cancel(pendingIntent)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    timeInMillis,
                    pendingIntent
                )
            }
            Log.d("MainActivity", "Alarm scheduled for $timeInMillis (isPunchIn=$isPunchIn)")
            return true
        } catch (e: Exception) {
            Log.e("MainActivity", "Error scheduling alarm", e)
            return false
        }
    }

    private fun cancelAlarm(isPunchIn: Boolean): Boolean {
        try {
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(this, AlarmReceiver::class.java)
            val requestCode = if (isPunchIn) 1001 else 1002
            val pendingIntent = PendingIntent.getBroadcast(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
            Log.d("MainActivity", "Alarm cancelled (isPunchIn=$isPunchIn)")
            return true
        } catch (e: Exception) {
            Log.e("MainActivity", "Error cancelling alarm", e)
            return false
        }
    }

    private fun stopActiveAlarm(): Boolean {
        return try {
            val serviceIntent = Intent(this, AlarmService::class.java)
            stopService(serviceIntent)
            Log.d("MainActivity", "AlarmService stopped")
            true
        } catch (e: Exception) {
            Log.e("MainActivity", "Error stopping AlarmService", e)
            false
        }
    }

    private fun isDndAccessGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.isNotificationPolicyAccessGranted
        } else {
            true
        }
    }

    private fun requestDndAccess(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !isDndAccessGranted()) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error requesting DND permission", e)
            false
        }
    }

    private fun isBatteryOptimizationIgnored(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val manager = getSystemService(Context.POWER_SERVICE) as PowerManager
            manager.isIgnoringBatteryOptimizations(packageName)
        } else {
            true
        }
    }

    private fun openAutostartSettings(): Boolean {
        val intents = listOf(
            Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
            Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")),
            Intent().setComponent(ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
            Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")),
            Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
            Intent().setComponent(ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.APPLaunchManager"))
        )

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                return true
            } catch (e: Exception) {
                // Try next
            }
        }

        // Fallback: Open standard App Settings
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    private fun openBatteryOptimizationSettings(): Boolean {
        try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            return true
        } catch (e: Exception) {
            // Fallback: Open standard App Settings
            try {
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(fallbackIntent)
                return true
            } catch (ex: Exception) {
                return false
            }
        }
    }
}
