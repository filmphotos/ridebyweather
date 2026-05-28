package com.ridebyweather.wear.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** POST /api/auth/login request body. */
@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

/**
 * Generic error envelope. Most routes return { "error": "..." } as a string;
 * a few validation routes return an object instead — in that case decoding
 * fails and the caller falls back to the HTTP status code.
 */
@Serializable
data class ErrorResponse(
    val error: String? = null,
)

/** POST /api/auth/login response (token added for non-browser clients). */
@Serializable
data class LoginResponse(
    val token: String? = null,
    val tier: String? = null,
    val user: LoginUser? = null,
)

@Serializable
data class LoginUser(
    val id: String? = null,
    val email: String? = null,
    val name: String? = null,
)

/** GET /api/ride-score response. */
@Serializable
data class RideScoreResponse(
    val score: Double? = null,
    val label: String? = null,
    val color: String? = null,
    val explanation: String? = null,
    val weather: WeatherDto? = null,
)

@Serializable
data class WeatherDto(
    val tempF: Double? = null,
    val feelsLikeF: Double? = null,
    val humidity: Double? = null,
    val windSpeedMph: Double? = null,
    val windGustMph: Double? = null,
    val windDirDeg: Double? = null,
    val precipProb: Double? = null,
    val condition: String? = null,
)

/** GET /api/medical response. */
@Serializable
data class MedicalResponse(
    val medical: List<Medical> = emptyList(),
)

@Serializable
data class Medical(
    val id: String? = null,
    val name: String,
    val type: String? = null,
    val lat: Double,
    val lng: Double,
    val address: String? = null,
    val phone: String? = null,
    @SerialName("distanceMi") val distanceMi: Double? = null,
)
