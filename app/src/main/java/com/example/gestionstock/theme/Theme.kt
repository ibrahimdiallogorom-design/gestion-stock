package com.example.gestionstock.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = DeepBlue,
    secondary = TealAccent,
    background = DarkBackground,
    surface = CardSurface,
    onPrimary = TextWhite,
    onSecondary = TextWhite,
    onBackground = TextWhite,
    onSurface = TextWhite
)

private val LightColorScheme = lightColorScheme(
    primary = DeepBlue,
    secondary = TealAccent,
    background = TextWhite,
    surface = TextWhite,
    onPrimary = TextWhite,
    onSecondary = TextWhite,
    onBackground = DarkBackground,
    onSurface = DarkBackground
)

@Composable
fun GestionStockTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
