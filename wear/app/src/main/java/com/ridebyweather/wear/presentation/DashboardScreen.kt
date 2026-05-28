package com.ridebyweather.wear.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.ridebyweather.wear.MainViewModel
import kotlin.math.roundToInt

@Composable
fun DashboardScreen(
    vm: MainViewModel,
    onRequestLocationPermission: () -> Unit,
    onOpenHospitals: () -> Unit,
    onOpenSettings: () -> Unit,
    onSignIn: () -> Unit,
) {
    val state by vm.dashboard.collectAsStateWithLifecycle()
    val listState = rememberScalingLazyListState()

    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = listState,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text(
                text = "RideByWeather",
                style = MaterialTheme.typography.caption1,
                color = MaterialTheme.colors.primary,
            )
        }

        when {
            state.checkingAuth -> item { CircularProgressIndicator() }

            !state.signedIn -> item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Sign in to see your ride conditions.",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.body2,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                    Chip(
                        label = { Text("Sign in") },
                        onClick = onSignIn,
                        colors = ChipDefaults.primaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            state.needsPermission -> item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Location is needed for weather at your spot.",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.body2,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                    Chip(
                        label = { Text("Allow location") },
                        onClick = onRequestLocationPermission,
                        colors = ChipDefaults.primaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            else -> {
                item { ScoreCard(vm) }
                item { WeatherRow(vm) }
                item {
                    Chip(
                        label = { Text("Nearest ER") },
                        onClick = onOpenHospitals,
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Chip(
                        label = { Text(if (state.loading) "Refreshing…" else "Refresh") },
                        onClick = { vm.refresh() },
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Chip(
                        label = { Text("Settings") },
                        onClick = onOpenSettings,
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        state.error?.let { err ->
            item {
                Text(
                    text = err,
                    color = MaterialTheme.colors.error,
                    style = MaterialTheme.typography.caption2,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun ScoreCard(vm: MainViewModel) {
    val state by vm.dashboard.collectAsStateWithLifecycle()
    val score = state.score

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (state.loading && score == null) {
            CircularProgressIndicator()
            return@Column
        }
        val color = parseHexColor(score?.color)
        Text(
            text = score?.score?.roundToInt()?.toString() ?: "--",
            color = color,
            fontWeight = FontWeight.Bold,
            fontSize = 56.sp,
        )
        Text(
            text = score?.label ?: "No data",
            color = color,
            style = MaterialTheme.typography.title3,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun WeatherRow(vm: MainViewModel) {
    val state by vm.dashboard.collectAsStateWithLifecycle()
    val w = state.score?.weather ?: return

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            Metric("Temp", w.tempF.toTempLabel())
            Metric("Feels", w.feelsLikeF.toTempLabel())
            Metric("Hum", w.humidity.toPercent())
        }
        val windDir = compass(w.windDirDeg)
        val gust = w.windGustMph?.let { " G${it.roundToInt()}" } ?: ""
        Text(
            text = "Wind ${w.windSpeedMph.toMph()} mph $windDir$gust".trim(),
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp),
        )
        w.condition?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.caption2,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, style = MaterialTheme.typography.title3)
        Text(
            text = label,
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
        )
    }
}
