package com.ridebyweather.wear.glance

/** Parse "#RRGGBB" into an ARGB int for ProtoLayout/complication use. */
fun parseArgb(hex: String?, fallback: Int = 0xFF22D3EE.toInt()): Int {
    if (hex.isNullOrBlank()) return fallback
    return runCatching { android.graphics.Color.parseColor(hex.trim()) }.getOrDefault(fallback)
}
