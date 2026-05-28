package com.ridebyweather.wear.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Thin client for the RideByWeather backend. All calls run on the IO
 * dispatcher and return a [Result] so callers can render error states.
 */
class RbwApi(private val settings: SettingsStore) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    /** Logs in with email/password and returns the JWT to persist. */
    suspend fun login(email: String, password: String): Result<String> =
        withContext(Dispatchers.IO) {
            runCatching {
                val base = settings.baseUrl()
                val payload = json.encodeToString(
                    LoginRequest.serializer(),
                    LoginRequest(email.trim(), password)
                )
                val req = Request.Builder()
                    .url("$base/api/auth/login")
                    .post(payload.toRequestBody(jsonMedia))
                    .header("Accept", "application/json")
                    .build()

                client.newCall(req).execute().use { resp ->
                    val body = resp.body?.string().orEmpty()
                    if (!resp.isSuccessful) {
                        error(friendlyError(resp.code, body, "Login failed"))
                    }
                    val parsed = json.decodeFromString(LoginResponse.serializer(), body)
                    parsed.token ?: error("Server did not return a token. Update the app/server.")
                }
            }
        }

    suspend fun rideScore(lat: Double, lng: Double, bearing: Float?): Result<RideScoreResponse> =
        authedGet(
            path = "/api/ride-score",
            query = buildString {
                append("lat=").append(lat)
                append("&lng=").append(lng)
                if (bearing != null) append("&routeBearing=").append(bearing)
            },
            deserialize = { json.decodeFromString(RideScoreResponse.serializer(), it) }
        )

    suspend fun medical(lat: Double, lng: Double, radiusMi: Int = 25): Result<List<Medical>> =
        authedGet(
            path = "/api/medical",
            query = "lat=$lat&lng=$lng&radius=$radiusMi",
            deserialize = { json.decodeFromString(MedicalResponse.serializer(), it).medical }
        )

    private suspend fun <T> authedGet(
        path: String,
        query: String,
        deserialize: (String) -> T,
    ): Result<T> = withContext(Dispatchers.IO) {
        runCatching {
            val base = settings.baseUrl()
            val token = settings.token()
                ?: error("Not signed in. Open Settings on the watch to sign in.")

            val req = Request.Builder()
                .url("$base$path?$query")
                .header("Authorization", "Bearer $token")
                .header("Accept", "application/json")
                .get()
                .build()

            client.newCall(req).execute().use { resp ->
                val body = resp.body?.string().orEmpty()
                if (resp.code == 401) error("Session expired. Sign in again.")
                if (!resp.isSuccessful) error(friendlyError(resp.code, body, "Request failed"))
                deserialize(body)
            }
        }
    }

    private fun friendlyError(code: Int, body: String, fallback: String): String {
        // The API returns { "error": "..." } in most failure cases.
        val msg = runCatching {
            json.decodeFromString(ErrorResponse.serializer(), body).error
        }.getOrNull()
        return msg ?: "$fallback (HTTP $code)"
    }
}
