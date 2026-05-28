package com.ridebyweather.wear.presentation

import androidx.compose.runtime.Composable
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Vignette
import androidx.wear.compose.material.VignettePosition
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.ridebyweather.wear.MainViewModel

object Routes {
    const val DASHBOARD = "dashboard"
    const val HOSPITALS = "hospitals"
    const val SETTINGS = "settings"
    const val LOGIN = "login"
}

@Composable
fun WearApp(
    vm: MainViewModel,
    onRequestLocationPermission: () -> Unit,
) {
    MaterialTheme {
        val navController = rememberSwipeDismissableNavController()

        Scaffold(
            timeText = { TimeText() },
            vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
        ) {
            SwipeDismissableNavHost(
                navController = navController,
                startDestination = Routes.DASHBOARD,
            ) {
                composable(Routes.DASHBOARD) {
                    DashboardScreen(
                        vm = vm,
                        onRequestLocationPermission = onRequestLocationPermission,
                        onOpenHospitals = {
                            vm.loadHospitals()
                            navController.navigate(Routes.HOSPITALS)
                        },
                        onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                        onSignIn = { navController.navigate(Routes.LOGIN) },
                    )
                }
                composable(Routes.HOSPITALS) {
                    HospitalScreen(vm = vm, onRetry = { vm.loadHospitals() })
                }
                composable(Routes.SETTINGS) {
                    SettingsScreen(
                        vm = vm,
                        onSignIn = { navController.navigate(Routes.LOGIN) },
                    )
                }
                composable(Routes.LOGIN) {
                    LoginScreen(
                        vm = vm,
                        onLoggedIn = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
