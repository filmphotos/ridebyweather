package com.ridebyweather.wear

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ridebyweather.wear.data.Medical
import com.ridebyweather.wear.data.RbwApi
import com.ridebyweather.wear.data.RideScoreResponse
import com.ridebyweather.wear.data.SettingsStore
import com.ridebyweather.wear.location.LocationHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardState(
    val loading: Boolean = false,
    val checkingAuth: Boolean = true,
    val signedIn: Boolean = false,
    val needsPermission: Boolean = false,
    val score: RideScoreResponse? = null,
    val error: String? = null,
)

data class HospitalsState(
    val loading: Boolean = false,
    val items: List<Medical> = emptyList(),
    val error: String? = null,
)

data class LoginState(
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val settings = SettingsStore(app)
    private val api = RbwApi(settings)
    private val location = LocationHelper(app)

    private val _dashboard = MutableStateFlow(DashboardState())
    val dashboard: StateFlow<DashboardState> = _dashboard.asStateFlow()

    private val _hospitals = MutableStateFlow(HospitalsState())
    val hospitals: StateFlow<HospitalsState> = _hospitals.asStateFlow()

    private val _login = MutableStateFlow(LoginState())
    val login: StateFlow<LoginState> = _login.asStateFlow()

    private val _baseUrl = MutableStateFlow("")
    val baseUrl: StateFlow<String> = _baseUrl.asStateFlow()

    init {
        viewModelScope.launch {
            _baseUrl.value = settings.baseUrl()
            val signedIn = settings.token() != null
            _dashboard.update { it.copy(checkingAuth = false, signedIn = signedIn) }
            if (signedIn) refresh()
        }
    }

    /** Called by the Activity after the location permission result. */
    fun onPermissionResult(granted: Boolean) {
        _dashboard.update { it.copy(needsPermission = !granted) }
        if (granted) refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            if (settings.token() == null) {
                _dashboard.update { it.copy(signedIn = false) }
                return@launch
            }
            if (!location.hasPermission()) {
                _dashboard.update { it.copy(needsPermission = true, loading = false) }
                return@launch
            }
            _dashboard.update { it.copy(loading = true, error = null, needsPermission = false) }

            val loc = location.current()
            if (loc == null) {
                _dashboard.update {
                    it.copy(loading = false, error = "Couldn't get your location. Move outdoors and retry.")
                }
                return@launch
            }
            val bearing = if (loc.hasBearing()) loc.bearing else null

            api.rideScore(loc.latitude, loc.longitude, bearing)
                .onSuccess { res -> _dashboard.update { it.copy(loading = false, score = res, signedIn = true) } }
                .onFailure { e -> _dashboard.update { it.copy(loading = false, error = e.message ?: "Failed to load") } }
        }
    }

    fun loadHospitals() {
        viewModelScope.launch {
            if (!location.hasPermission()) {
                _hospitals.update { it.copy(error = "Location permission needed.") }
                return@launch
            }
            _hospitals.update { it.copy(loading = true, error = null) }
            val loc = location.current()
            if (loc == null) {
                _hospitals.update { it.copy(loading = false, error = "Couldn't get your location.") }
                return@launch
            }
            api.medical(loc.latitude, loc.longitude)
                .onSuccess { list -> _hospitals.update { it.copy(loading = false, items = list) } }
                .onFailure { e -> _hospitals.update { it.copy(loading = false, error = e.message ?: "Failed to load") } }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _login.update { it.copy(loading = true, error = null, success = false) }
            api.login(email, password)
                .onSuccess { token ->
                    settings.setToken(token)
                    _login.update { it.copy(loading = false, success = true) }
                    _dashboard.update { it.copy(signedIn = true) }
                    refresh()
                }
                .onFailure { e ->
                    _login.update { it.copy(loading = false, error = e.message ?: "Login failed") }
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            settings.setToken(null)
            _dashboard.update { DashboardState(checkingAuth = false, signedIn = false) }
            _hospitals.update { HospitalsState() }
            _login.update { LoginState() }
        }
    }

    fun saveBaseUrl(url: String) {
        viewModelScope.launch {
            settings.setBaseUrl(url)
            _baseUrl.value = settings.baseUrl()
        }
    }
}
