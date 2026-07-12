package com.eazzio.payroll

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AlarmReceiver", "Alarm received!")
        val isPunchIn = intent.getBooleanExtra("isPunchIn", true)
        val customTunePath = intent.getStringExtra("customTunePath")

        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra("isPunchIn", isPunchIn)
            putExtra("customTunePath", customTunePath)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d("AlarmReceiver", "AlarmService started successfully")
        } catch (e: Exception) {
            Log.e("AlarmReceiver", "Failed to start AlarmService", e)
        }
    }
}
