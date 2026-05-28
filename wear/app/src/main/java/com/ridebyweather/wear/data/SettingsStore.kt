package com.ridebyweather.wear.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ridebyweather.wear.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "rbw_settings")

/**
 * Persists the backend base URL and the auth token (the JWT returned by
 * /api/auth/login). Stored locally on the watch via DataStore.
 */
class SettingsStore(private val context: Context) {

    private object Keys {
        val BASE_URL = stringPreferencesKey("base_url")
        val TOKEN = stringPreferencesKey("token")

        // Cached score snapshot for the tile + complication (so they don't each
        // hit the network/location themselves).
        val SNAP_SCORE = intPreferencesKey("snap_score")
        val SNAP_LABEL = stringPreferencesKey("snap_label")
        val SNAP_COLOR = stringPreferencesKey("snap_color")
        val SNAP_TEMP = intPreferencesKey("snap_temp")
        val SNAP_UPDATED = longPreferencesKey("snap_updated")
    }

    val baseUrlFlow = context.dataStore.data.map { prefs ->
        prefs[Keys.BASE_URL]?.takeIf { it.isNotBlank() } ?: BuildConfig.DEFAULT_BASE_URL
    }

    val tokenFlow = context.dataStore.data.map { prefs -> prefs[Keys.TOKEN] }

    suspend fun baseUrl(): String = baseUrlFlow.first()

    suspend fun token(): String? = tokenFlow.first()

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[Keys.BASE_URL] = normalizeUrl(url) }
    }

    suspend fun setToken(token: String?) {
        context.dataStore.edit { prefs ->
            if (token.isNullOrBlank()) prefs.remove(Keys.TOKEN) else prefs[Keys.TOKEN] = token
        }
    }

    /** Stores the latest computed score for glanceable surfaces. */
    suspend fun setScoreSnapshot(score: Int?, label: String?, colorHex: String?, tempF: Int?) {
        context.dataStore.edit { p ->
            if (score != null) p[Keys.SNAP_SCORE] = score else p.remove(Keys.SNAP_SCORE)
            if (label != null) p[Keys.SNAP_LABEL] = label else p.remove(Keys.SNAP_LABEL)
            if (colorHex != null) p[Keys.SNAP_COLOR] = colorHex else p.remove(Keys.SNAP_COLOR)
            if (tempF != null) p[Keys.SNAP_TEMP] = tempF else p.remove(Keys.SNAP_TEMP)
            p[Keys.SNAP_UPDATED] = System.currentTimeMillis()
        }
    }

    suspend fun scoreSnapshot(): ScoreSnapshot? {
        val p = context.dataStore.data.first()
        val updated = p[Keys.SNAP_UPDATED] ?: return null
        return ScoreSnapshot(
            score = p[Keys.SNAP_SCORE],
            label = p[Keys.SNAP_LABEL],
            colorHex = p[Keys.SNAP_COLOR],
            tempF = p[Keys.SNAP_TEMP],
            updatedAt = updated,
        )
    }

    companion object {
        /** Trim trailing slash so we can build "$base/api/..." cleanly. */
        fun normalizeUrl(raw: String): String {
            var u = raw.trim()
            if (u.isEmpty()) return u
            if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://$u"
            return u.trimEnd('/')
        }
    }
}
