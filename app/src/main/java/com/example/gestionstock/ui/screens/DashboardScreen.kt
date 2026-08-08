package com.example.gestionstock.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.local.entity.SaleEntity
import com.example.gestionstock.data.repository.ProductRepository
import com.example.gestionstock.data.repository.SaleRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    productRepository: ProductRepository,
    saleRepository: SaleRepository,
    onNavigateToSales: () -> Unit,
    onNavigateToProducts: () -> Unit
) {
    var totalSalesToday by remember { mutableStateOf(0.0) }
    var salesCountToday by remember { mutableStateOf(0) }
    var totalStockValue by remember { mutableStateOf(0.0) }
    var lowStockCount by remember { mutableStateOf(0) }
    var lowStockProducts by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    var recentSales by remember { mutableStateOf<List<SaleEntity>>(emptyList()) }
    
    // Pour le graphique
    var chartPoints by remember { mutableStateOf<List<Double>>(listOf(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)) }

    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            val calendar = Calendar.getInstance()
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startOfDay = calendar.timeInMillis

            totalSalesToday = saleRepository.getTotalSalesToday(startOfDay)
            salesCountToday = saleRepository.getCountToday(startOfDay)
            totalStockValue = productRepository.getTotalStockValue()
            lowStockCount = productRepository.getLowStockCount()
            lowStockProducts = productRepository.getLowStockProducts().first().take(5)
            recentSales = saleRepository.getAllSales().first().take(5)

            // Charger les ventes des 7 derniers jours pour le graphique
            val tempPoints = mutableListOf<Double>()
            for (i in 6 downTo 0) {
                val dayCalendar = Calendar.getInstance()
                dayCalendar.add(Calendar.DAY_OF_YEAR, -i)
                dayCalendar.set(Calendar.HOUR_OF_DAY, 0)
                dayCalendar.set(Calendar.MINUTE, 0)
                val start = dayCalendar.timeInMillis
                dayCalendar.set(Calendar.HOUR_OF_DAY, 23)
                dayCalendar.set(Calendar.MINUTE, 59)
                val end = dayCalendar.timeInMillis
                val salesSum = saleRepository.getTotalSalesInRange(start, end)
                tempPoints.add(salesSum)
            }
            chartPoints = tempPoints
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tableau de Bord", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Stats Cards Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    StatCard(
                        title = "Ventes Aujourd'hui",
                        value = "${String.format(Locale.US, "%,.2f", totalSalesToday)} FCFA",
                        subtext = "$salesCountToday transaction(s)",
                        icon = Icons.Default.TrendingUp,
                        iconColor = Color(0xFF4CAF50),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Valeur du Stock",
                        value = "${String.format(Locale.US, "%,.2f", totalStockValue)} FCFA",
                        subtext = "Total en magasin",
                        icon = Icons.Default.Inventory,
                        iconColor = Color(0xFF2196F3),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Low Stock Warning Card
            if (lowStockCount > 0) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = Color(0xFFFCA5A5),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "Alerte de Stock Faible !",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "$lowStockCount produit(s) sous le seuil minimum.",
                                    color = Color(0xFFFCA5A5),
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            // Sales Chart Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Activité des 7 derniers jours",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        // Simple Custom Line Chart via Canvas
                        Canvas(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(150.dp)
                        ) {
                            val width = size.width
                            val height = size.height
                            val maxVal = chartPoints.maxOrNull() ?: 1.0
                            val scaleY = if (maxVal > 0) height / maxVal else 1f
                            val stepX = width / 6f

                            val path = Path()
                            chartPoints.forEachIndexed { index, value ->
                                val x = index * stepX
                                val y = height - (value.toFloat() * scaleY.toFloat())
                                if (index == 0) {
                                    path.moveTo(x, y)
                                } else {
                                    path.lineTo(x, y)
                                }
                                // Draw points
                                drawCircle(
                                    color = Color(0xFF00B4D8),
                                    radius = 4.dp.toPx(),
                                    center = Offset(x, y)
                                )
                            }
                            
                            drawPath(
                                path = path,
                                color = Color(0xFF00B4D8),
                                style = Stroke(width = 3.dp.toPx())
                            )
                        }
                    }
                }
            }

            // Low Stock Products Details
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Stocks Critiques",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            TextButton(onClick = onNavigateToProducts) {
                                Text("Voir Tout", color = Color(0xFF00B4D8))
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        if (lowStockProducts.isEmpty()) {
                            Text("Aucune alerte de stock", color = Color.Gray, fontSize = 14.sp)
                        } else {
                            lowStockProducts.forEach { product ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(product.name, color = Color.White, fontWeight = FontWeight.Medium)
                                    Text(
                                        "${product.stockQuantity} ${product.unit} (Seuil: ${product.minStockAlert})",
                                        color = Color(0xFFFF5252),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Divider(color = Color.White.copy(alpha = 0.1f))
                            }
                        }
                    }
                }
            }

            // Recent Transactions
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Dernières Ventes",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            TextButton(onClick = onNavigateToSales) {
                                Text("Historique", color = Color(0xFF00B4D8))
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        if (recentSales.isEmpty()) {
                            Text("Aucune vente récente", color = Color.Gray, fontSize = 14.sp)
                        } else {
                            val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                            recentSales.forEach { sale ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Vente #${sale.id}", color = Color.White, fontWeight = FontWeight.SemiBold)
                                        Text(sdf.format(Date(sale.createdAt)), color = Color.Gray, fontSize = 12.sp)
                                    }
                                    Text(
                                        "${String.format(Locale.US, "%,.2f", sale.totalAmount)} FCFA",
                                        color = Color(0xFF4CAF50),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Divider(color = Color.White.copy(alpha = 0.1f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    subtext: String,
    icon: ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    color = Color.Gray,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Icon(
                    icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = value,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtext,
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
    }
}
