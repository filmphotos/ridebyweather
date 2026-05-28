package com.ridebyweather.wear.tile

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.FONT_WEIGHT_BOLD
import androidx.wear.protolayout.LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.ListenableFuture
import com.ridebyweather.wear.MainActivity
import com.ridebyweather.wear.data.ScoreSnapshot
import com.ridebyweather.wear.data.SettingsStore
import com.ridebyweather.wear.glance.parseArgb
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.guava.future

/**
 * Swipe-left Tile showing the cached ride/heat-risk score in its color.
 * Reads the snapshot written by the app / background worker — it does not do
 * network or location itself (tiles can't reliably request runtime permissions).
 */
class HeatTileService : TileService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest,
    ): ListenableFuture<TileBuilders.Tile> = scope.future {
        val snap = SettingsStore(applicationContext).scoreSnapshot()
        TileBuilders.Tile.Builder()
            .setResourcesVersion(RES_VERSION)
            .setFreshnessIntervalMillis(REFRESH_MS)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(snap)))
            .build()
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest,
    ): ListenableFuture<ResourceBuilders.Resources> = scope.future {
        ResourceBuilders.Resources.Builder().setVersion(RES_VERSION).build()
    }

    private fun layout(snap: ScoreSnapshot?): LayoutElementBuilders.LayoutElement {
        val color = parseArgb(snap?.colorHex)
        val scoreText = snap?.score?.toString() ?: "--"
        val label = snap?.label ?: "Open app to load"
        val temp = snap?.tempF?.let { "$it°F" } ?: ""

        val column = LayoutElementBuilders.Column.Builder()
            .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
            .addContent(text(scoreText, color, 48f, bold = true))
            .addContent(text(label, color, 16f))

        if (temp.isNotEmpty()) column.addContent(text(temp, 0xFFB0B0B0.toInt(), 13f))

        return LayoutElementBuilders.Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(openAppModifier())
            .addContent(column.build())
            .build()
    }

    private fun text(value: String, colorArgb: Int, sizeSp: Float, bold: Boolean = false) =
        LayoutElementBuilders.Text.Builder()
            .setText(value)
            .setMaxLines(2)
            .setFontStyle(
                LayoutElementBuilders.FontStyle.Builder()
                    .setSize(sp(sizeSp))
                    .setColor(argb(colorArgb))
                    .apply { if (bold) setWeight(FONT_WEIGHT_BOLD) }
                    .build()
            )
            .build()

    private fun openAppModifier(): ModifiersBuilders.Modifiers =
        ModifiersBuilders.Modifiers.Builder()
            .setClickable(
                ModifiersBuilders.Clickable.Builder()
                    .setId("open_rbw")
                    .setOnClick(
                        ActionBuilders.LaunchAction.Builder()
                            .setAndroidActivity(
                                ActionBuilders.AndroidActivity.Builder()
                                    .setPackageName(packageName)
                                    .setClassName(MainActivity::class.java.name)
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val RES_VERSION = "1"
        private const val REFRESH_MS = 30L * 60L * 1000L
    }
}
