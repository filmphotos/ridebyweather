package com.ridebyweather.wear.work

import android.content.ComponentName
import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ridebyweather.wear.complication.HeatComplicationService
import com.ridebyweather.wear.data.RbwApi
import com.ridebyweather.wear.data.SettingsStore
import com.ridebyweather.wear.location.LocationHelper
import com.ridebyweather.wear.tile.HeatTileService
import kotlin.math.roundToInt

/**
 * Periodically refreshes the cached score so the tile + complication stay
 * current without the user opening the app. Requires that the user has signed
 * in (token present) and granted location.
 */
class ScoreRefreshWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val store = SettingsStore(applicationContext)
        // Not signed in yet — nothing to refresh, don't keep retrying.
        if (store.token() == null) return Result.success()

        val location = LocationHelper(applicationContext)
        if (!location.hasPermission()) return Result.success()

        val loc = location.current() ?: return Result.retry()
        val bearing = if (loc.hasBearing()) loc.bearing else null

        val result = RbwApi(store).rideScore(loc.latitude, loc.longitude, bearing)
        return result.fold(
            onSuccess = { res ->
                store.setScoreSnapshot(
                    score = res.score?.roundToInt(),
                    label = res.label,
                    colorHex = res.color,
                    tempF = res.weather?.tempF?.roundToInt(),
                )
                requestGlanceUpdates(applicationContext)
                Result.success()
            },
            onFailure = { Result.retry() },
        )
    }

    companion object {
        /** Refreshes the tile + complication from the latest cached snapshot. */
        fun requestGlanceUpdates(context: Context) {
            runCatching {
                TileService.getUpdater(context).requestUpdate(HeatTileService::class.java)
            }
            runCatching {
                ComplicationDataSourceUpdateRequester
                    .create(
                        context = context,
                        complicationDataSourceComponent = ComponentName(
                            context,
                            HeatComplicationService::class.java,
                        ),
                    )
                    .requestUpdateAll()
            }
        }
    }
}
