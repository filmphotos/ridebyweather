package com.ridebyweather.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.ridebyweather.wear.MainViewModel

@Composable
fun SettingsScreen(vm: MainViewModel, onSignIn: () -> Unit) {
    val baseUrl by vm.baseUrl.collectAsStateWithLifecycle()
    val dash by vm.dashboard.collectAsStateWithLifecycle()
    var urlField by remember(baseUrl) { mutableStateOf(baseUrl) }
    val listState = rememberScalingLazyListState()

    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = listState,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text("Settings", style = MaterialTheme.typography.title3, color = MaterialTheme.colors.primary)
        }
        item {
            Text(
                "Server URL",
                style = MaterialTheme.typography.caption2,
                color = MaterialTheme.colors.onSurfaceVariant,
            )
        }
        item {
            WatchTextField(
                value = urlField,
                onValueChange = { urlField = it },
                keyboardType = KeyboardType.Uri,
                placeholder = "https://ridebyweather.com",
            )
        }
        item {
            Chip(
                label = { Text("Save URL") },
                onClick = { vm.saveBaseUrl(urlField) },
                colors = ChipDefaults.primaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            if (dash.signedIn) {
                Chip(
                    label = { Text("Sign out") },
                    onClick = { vm.signOut() },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Chip(
                    label = { Text("Sign in") },
                    onClick = onSignIn,
                    colors = ChipDefaults.primaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
fun LoginScreen(vm: MainViewModel, onLoggedIn: () -> Unit) {
    val login by vm.login.collectAsStateWithLifecycle()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val listState = rememberScalingLazyListState()

    LaunchedEffect(login.success) {
        if (login.success) onLoggedIn()
    }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = listState,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text("Sign in", style = MaterialTheme.typography.title3, color = MaterialTheme.colors.primary)
        }
        item {
            WatchTextField(
                value = email,
                onValueChange = { email = it },
                keyboardType = KeyboardType.Email,
                placeholder = "email",
            )
        }
        item {
            WatchTextField(
                value = password,
                onValueChange = { password = it },
                keyboardType = KeyboardType.Password,
                password = true,
                placeholder = "password",
            )
        }
        item {
            Chip(
                label = { Text(if (login.loading) "Signing in…" else "Sign in") },
                onClick = { if (!login.loading) vm.signIn(email, password) },
                colors = ChipDefaults.primaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (login.loading) item { CircularProgressIndicator() }
        login.error?.let { err ->
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

/**
 * Minimal text field for Wear. Tapping it opens the watch input method
 * (Gboard / voice / handwriting on Wear OS 3+).
 */
@Composable
private fun WatchTextField(
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType,
    placeholder: String = "",
    password: Boolean = false,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp)) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = TextStyle(color = Color.White, textAlign = TextAlign.Center),
            cursorBrush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colors.primary),
            visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Done),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colors.surface)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        )
        if (value.isEmpty() && placeholder.isNotEmpty()) {
            Text(
                text = placeholder,
                style = MaterialTheme.typography.caption2,
                color = MaterialTheme.colors.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
