package com.eazzio.payroll

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File

class AlarmService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private val NOTIFICATION_ID = 9999
    private val handler = Handler(Looper.getMainLooper())
    private var isPunchIn: Boolean = true
    private var customTunePath: String? = null

    private val stopAlarmRunnable = Runnable {
        Log.d("AlarmService", "Alarm timed out after 15 seconds. Triggering auto-snooze.")
        snoozeAlarm(isPunchIn, customTunePath)
        stopSelf()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("AlarmService", "AlarmService onStartCommand")
        
        if (intent?.action == "com.eazzio.payroll.ACTION_SNOOZE") {
            Log.d("AlarmService", "Snooze action triggered via intent")
            val isPunchInArg = intent.getBooleanExtra("isPunchIn", true)
            val customTunePathArg = intent.getStringExtra("customTunePath")
            snoozeAlarm(isPunchInArg, customTunePathArg)
            stopSelf()
            return START_NOT_STICKY
        }

        isPunchIn = intent?.getBooleanExtra("isPunchIn", true) ?: true
        customTunePath = intent?.getStringExtra("customTunePath")

        val channelId = "punch_alarm_channel"
        createNotificationChannel(channelId)

        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("alarmActive", true)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val snoozeIntent = Intent(this, AlarmService::class.java).apply {
            action = "com.eazzio.payroll.ACTION_SNOOZE"
            putExtra("isPunchIn", isPunchIn)
            putExtra("customTunePath", customTunePath)
        }
        val snoozePendingIntent = PendingIntent.getService(
            this,
            1003,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val title = if (isPunchIn) "It's your punching time." else "It's your punch-out time."
        val body = "Tap here to complete your punch status immediately."

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_lock_idle_alarm, "Snooze (5m)", snoozePendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        playAlarmSound(customTunePath)

        return START_STICKY
    }

    private fun createNotificationChannel(channelId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(
                    channelId,
                    "Punch Alarm Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Channel for continuous punch reminders"
                    enableLights(true)
                    enableVibration(true)
                    setBypassDnd(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    private fun playAlarmSound(customTunePath: String?) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null

            val soundUri: Uri = if (!customTunePath.isNullOrEmpty() && File(customTunePath).exists()) {
                Uri.fromFile(File(customTunePath))
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, soundUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            Log.d("AlarmService", "Alarm playing sound: $soundUri")

            // Automatically auto-snooze the alarm after 15 seconds to avoid annoyance
            handler.removeCallbacks(stopAlarmRunnable)
            handler.postDelayed(stopAlarmRunnable, 15000)
        } catch (e: Exception) {
            Log.e("AlarmService", "Error playing alarm sound", e)
        }
    }

    private fun snoozeAlarm(isPunchIn: Boolean, customTunePath: String?) {
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

            val triggerTime = System.currentTimeMillis() + 5 * 60 * 1000 // 5 minutes snooze

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
            Log.d("AlarmService", "Alarm successfully scheduled for snooze (5 min)")
        } catch (e: Exception) {
            Log.e("AlarmService", "Error scheduling snooze alarm", e)
        }
    }

    override fun onDestroy() {
        Log.d("AlarmService", "AlarmService onDestroy")
        handler.removeCallbacks(stopAlarmRunnable)
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e("AlarmService", "Error releasing media player", e)
        }
        super.onDestroy()
    }
}
