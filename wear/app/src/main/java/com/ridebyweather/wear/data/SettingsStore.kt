package com.ridebyweather.wear.data

import android.content.Context
import androidx.datastore.preferences.core.edit
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
