package com.ridebyweather.wear.presentation

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.ridebyweather.wear.MainViewModel
import com.ridebyweather.wear.data.Medical
import kotlin.math.roundToInt

@Composable
fun HospitalScreen(vm: MainViewModel, onRetry: () -> Unit) {
    val state by vm.hospitals.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val listState = rememberScalingLazyListState()

    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = listState,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text(
                text = "Nearest care",
                style = MaterialTheme.typography.title3,
                color = MaterialTheme.colors.primary,
            )
        }

        when {
            state.loading -> item { CircularProgressIndicator() }

            state.error != null -> {
                item {
                    Text(
                        text = state.error!!,
                        color = MaterialTheme.colors.error,
                        style = MaterialTheme.typography.caption1,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
                item {
                    Chip(
                        label = { Text("Retry") },
                        onClick = onRetry,
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            state.items.isEmpty() -> item {
                Text(
                    text = "No facilities found nearby.",
                    style = MaterialTheme.typography.body2,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(8.dp),
                )
            }

            else -> items(state.items) { m ->
                Chip(
                    label = { Text(m.name, maxLines = 2) },
                    secondaryLabel = { Text(subtitle(m)) },
                    onClick = { openDirections(context, m) },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

private fun subtitle(m: Medical): String {
    val dist = m.distanceMi?.let { "${(it * 10).roundToInt() / 10.0} mi" }
    val type = m.type?.replace('_', ' ')
    return listOfNotNull(dist, type).joinToString(" · ")
}

private fun openDirections(context: android.content.Context, m: Medical) {
    // Try turn-by-turn navigation; fall back to a map pin; finally toast.
    val nav = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${m.lat},${m.lng}"))
    val geo = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("geo:${m.lat},${m.lng}?q=${m.lat},${m.lng}(${Uri.encode(m.name)})")
    )
    runCatching { context.startActivity(nav) }
        .recoverCatching { context.startActivity(geo) }
        .onFailure {
            Toast.makeText(context, "No maps app on this watch", Toast.LENGTH_SHORT).show()
        }
}
