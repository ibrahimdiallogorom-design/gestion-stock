package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.SaleEntity
import com.example.gestionstock.data.local.entity.SaleItemEntity
import com.example.gestionstock.data.repository.ProductRepository
import com.example.gestionstock.data.repository.SaleRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaleDetailScreen(
    saleId: Int,
    saleRepository: SaleRepository,
    productRepository: ProductRepository,
    onNavigateBack: () -> Unit
) {
    var sale by remember { mutableStateOf<SaleEntity?>(null) }
    var items by remember { mutableStateOf<List<SaleItemEntity>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(saleId) {
        scope.launch {
            sale = saleRepository.getSaleById(saleId)
            items = saleRepository.getItemsBySaleId(saleId)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Détails de la Vente #${saleId}", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp)
        ) {
            if (sale == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF00B4D8))
                }
            } else {
                val currentSale = sale!!
                val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Date", color = Color.Gray, fontSize = 14.sp)
                            Text(sdf.format(Date(currentSale.createdAt)), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Mode Paiement", color = Color.Gray, fontSize = 14.sp)
                            Text(currentSale.paymentMethod, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Statut", color = Color.Gray, fontSize = 14.sp)
                            Text(
                                currentSale.status,
                                color = if (currentSale.status == "COMPLETED") Color(0xFF4CAF50) else Color.Red,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                        if (currentSale.notes.isNotBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Note", color = Color.Gray, fontSize = 14.sp)
                                Text(currentSale.notes, color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text("Articles Vendus", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(bottom = 8.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(items) { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(item.productName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("${item.quantity} x ${String.format(Locale.US, "%,.2f", item.unitPrice)} FCFA", color = Color.Gray, fontSize = 12.sp)
                            }
                            Text(
                                "${String.format(Locale.US, "%,.2f", item.totalPrice)} FCFA",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Totals
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Remise", color = Color.Gray, fontSize = 14.sp)
                            Text("${String.format(Locale.US, "%,.2f", currentSale.discountAmount)} FCFA", color = Color.White, fontSize = 14.sp)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("TVA", color = Color.Gray, fontSize = 14.sp)
                            Text("${(currentSale.taxRate * 100).toInt()}%", color = Color.White, fontSize = 14.sp)
                        }
                        Divider(color = Color.White.copy(alpha = 0.1f))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("TOTAL NET", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("${String.format(Locale.US, "%,.2f", currentSale.totalAmount)} FCFA", color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }

                if (Session.isAdmin && currentSale.status == "COMPLETED") {
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                // 1. Annuler la vente
                                val updatedSale = currentSale.copy(status = "CANCELLED")
                                saleRepository.updateSale(updatedSale)
                                
                                // 2. Restaurer les stocks
                                items.forEach { item ->
                                    productRepository.addStock(item.productId, item.quantity)
                                }
                                onNavigateBack()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("ANNULER LA VENTE (REMETTRE EN STOCK)", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
