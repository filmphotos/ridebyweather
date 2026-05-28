package com.ridebyweather.wear.complication

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.ridebyweather.wear.MainActivity
import com.ridebyweather.wear.data.SettingsStore

/**
 * Watch-face complication showing the cached ride/heat-risk score.
 * Note: complication coloring is controlled by the watch face theme, so the
 * "turn red" emphasis lives on the Tile; here we surface the number + label.
 */
class HeatComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? = when (type) {
        ComplicationType.SHORT_TEXT -> shortText("82", "Ride 82")
        ComplicationType.RANGED_VALUE -> ranged(82f, "82")
        else -> null
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData {
        val snap = SettingsStore(applicationContext).scoreSnapshot()
        val value = snap?.score
        val text = value?.toString() ?: "--"
        val label = snap?.label ?: "RideByWeather"
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> ranged(value?.toFloat() ?: 0f, text)
            else -> shortText(text, label)
        }
    }

    private fun shortText(text: String, description: String): ShortTextComplicationData =
        ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder(text).build(),
            contentDescription = PlainComplicationText.Builder(description).build(),
        ).setTapAction(openApp()).build()

    private fun ranged(value: Float, text: String): RangedValueComplicationData =
        RangedValueComplicationData.Builder(
            value = value.coerceIn(0f, 100f),
            min = 0f,
            max = 100f,
            contentDescription = PlainComplicationText.Builder("Ride risk score").build(),
        ).setText(PlainComplicationText.Builder(text).build())
            .setTapAction(openApp())
            .build()

    private fun openApp(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
    }
}
