package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreMenuScreen(
    onNavigate: (String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Menu Principal", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        }
    ) { paddingValues ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                MenuGridItem(
                    title = "Fournisseurs",
                    icon = Icons.Default.People,
                    color = Color(0xFF00B4D8),
                    onClick = { onNavigate("suppliers") }
                )
            }
            item {
                MenuGridItem(
                    title = "Approvisionnements",
                    icon = Icons.Default.LocalShipping,
                    color = Color(0xFF4CAF50),
                    onClick = { onNavigate("stock_entries") }
                )
            }
            item {
                MenuGridItem(
                    title = "Rapports Mensuels",
                    icon = Icons.Default.Assessment,
                    color = Color(0xFFFF9800),
                    onClick = { onNavigate("reports") }
                )
            }
            item {
                MenuGridItem(
                    title = "Historique Ventes",
                    icon = Icons.Default.History,
                    color = Color(0xFF9C27B0),
                    onClick = { onNavigate("sales_history") }
                )
            }
            item {
                MenuGridItem(
                    title = "Paramètres",
                    icon = Icons.Default.Settings,
                    color = Color(0xFF607D8B),
                    onClick = { onNavigate("settings") }
                )
            }
        }
    }
}

@Composable
fun MenuGridItem(
    title: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}
