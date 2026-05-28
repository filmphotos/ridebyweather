package com.ridebyweather.wear.presentation

import androidx.compose.ui.graphics.Color
import kotlin.math.roundToInt

/** Parse a "#RRGGBB" hex string from the API into a Compose Color, with fallback. */
fun parseHexColor(hex: String?, fallback: Color = Color(0xFF22D3EE)): Color {
    if (hex.isNullOrBlank()) return fallback
    return runCatching { Color(android.graphics.Color.parseColor(hex.trim())) }.getOrDefault(fallback)
}

fun Double?.toTempLabel(): String = this?.let { "${it.roundToInt()}°" } ?: "--°"

fun Double?.toPercent(): String = this?.let { "${it.roundToInt()}%" } ?: "--"

fun Double?.toMph(): String = this?.let { "${it.roundToInt()}" } ?: "--"

/** 0..360 degrees -> 8-point compass label. */
fun compass(deg: Double?): String {
    if (deg == null) return ""
    val dirs = arrayOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    val idx = (((deg % 360) + 360) % 360 / 45.0).roundToInt() % 8
    return dirs[idx]
}
