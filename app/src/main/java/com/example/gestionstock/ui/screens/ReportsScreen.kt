package com.example.gestionstock.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.local.entity.SaleEntity
import com.example.gestionstock.data.repository.ProductRepository
import com.example.gestionstock.data.repository.SaleRepository
import com.example.gestionstock.data.repository.StockEntryRepository
import com.example.gestionstock.utils.PdfReportGenerator
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    saleRepository: SaleRepository,
    productRepository: ProductRepository,
    stockEntryRepository: StockEntryRepository
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var enterpriseName by remember { mutableStateOf("Mon Entreprise de Gestion") }
    
    // Select Month Logic
    val sdfMonth = SimpleDateFormat("yyyy-MM", Locale.getDefault())
    val sdfDisplay = SimpleDateFormat("MMMM yyyy", Locale.FRANCE)
    
    var selectedMonth by remember { mutableStateOf(sdfMonth.format(Date())) }
    var selectedMonthDisplay by remember { mutableStateOf(sdfDisplay.format(Date())) }
    var showMonthDropdown by remember { mutableStateOf(false) }
    
    val monthOptions = remember {
        val list = mutableListOf<Pair<String, String>>()
        val cal = Calendar.getInstance()
        for (i in 0..11) {
            val key = sdfMonth.format(cal.time)
            val label = sdfDisplay.format(cal.time)
            list.add(Pair(key, label))
            cal.add(Calendar.MONTH, -1)
        }
        list
    }

    var monthlySales by remember { mutableStateOf<List<SaleEntity>>(emptyList()) }
    var products by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    var monthlyTotalCost by remember { mutableStateOf(0.0) }
    
    var isGeneratingPdf by remember { mutableStateOf(false) }

    fun loadMonthData(monthKey: String) {
        scope.launch {
            // Load sales for that month
            monthlySales = saleRepository.getSalesByMonth(monthKey)
            products = productRepository.getAll().first()
            
            // Get cost values
            val cal = Calendar.getInstance()
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val date = SimpleDateFormat("yyyy-MM", Locale.getDefault()).parse(monthKey) ?: Date()
            cal.time = date
            cal.set(Calendar.DAY_OF_MONTH, 1)
            val start = cal.timeInMillis
            cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
            val end = cal.timeInMillis
            
            monthlyTotalCost = stockEntryRepository.getTotalCostInRange(start, end)
        }
    }

    LaunchedEffect(selectedMonth) {
        loadMonthData(selectedMonth)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Rapports Mensuels", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Month Selector Box
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = selectedMonthDisplay,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Période du Rapport") },
                    trailingIcon = {
                        IconButton(onClick = { showMonthDropdown = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color.White)
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF00B4D8),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                DropdownMenu(
                    expanded = showMonthDropdown,
                    onDismissRequest = { showMonthDropdown = false },
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .background(Color(0xFF1E293B))
                ) {
                    monthOptions.forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option.second.replaceFirstChar { it.uppercase() }, color = Color.White) },
                            onClick = {
                                selectedMonth = option.first
                                selectedMonthDisplay = option.second
                                showMonthDropdown = false
                            }
                        )
                    }
                }
            }

            // Stats Summary Card
            val totalRevenue = monthlySales.sumOf { it.totalAmount }
            val netRevenue = totalRevenue - monthlySales.sumOf { it.discountAmount }
            
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Statistiques du Mois", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Divider(color = Color.White.copy(alpha = 0.1f))
                    
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Nombre de ventes", color = Color.Gray)
                        Text("${monthlySales.size} transaction(s)", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Chiffre d'Affaires Brut", color = Color.Gray)
                        Text("${String.format(Locale.US, "%,.2f", totalRevenue)} FCFA", color = Color(0xFF00B4D8), fontWeight = FontWeight.Bold)
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Chiffre d'Affaires Net", color = Color.Gray)
                        Text("${String.format(Locale.US, "%,.2f", netRevenue)} FCFA", color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Export to PDF Button
            Button(
                onClick = {
                    isGeneratingPdf = true
                    val file = PdfReportGenerator.generateMonthlyReport(
                        context = context,
                        yearMonth = selectedMonth,
                        sales = monthlySales,
                        products = products,
                        totalCost = monthlyTotalCost,
                        enterpriseName = enterpriseName
                    )
                    isGeneratingPdf = false

                    if (file != null) {
                        Toast.makeText(context, "Rapport PDF généré dans Téléchargements !", Toast.LENGTH_LONG).show()
                        openPdfFile(context, file)
                    } else {
                        Toast.makeText(context, "Échec de génération du PDF.", Toast.LENGTH_SHORT).show()
                    }
                },
                enabled = !isGeneratingPdf,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isGeneratingPdf) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("GÉNÉRER & OUVRIR LE RAPPORT PDF", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private fun openPdfFile(context: Context, file: File) {
    try {
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            file
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    } catch (e: Exception) {
        Toast.makeText(context, "Aucun lecteur PDF installé.", Toast.LENGTH_SHORT).show()
    }
}
