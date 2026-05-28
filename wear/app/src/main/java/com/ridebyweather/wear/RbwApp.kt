package com.ridebyweather.wear

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.ridebyweather.wear.work.ScoreRefreshWorker
import java.util.concurrent.TimeUnit

class RbwApp : Application() {

    override fun onCreate() {
        super.onCreate()
        scheduleScoreRefresh()
    }

    private fun scheduleScoreRefresh() {
        val request = PeriodicWorkRequestBuilder<ScoreRefreshWorker>(30, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "score_refresh",
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }
}
