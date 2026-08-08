package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.local.entity.StockEntryEntity
import com.example.gestionstock.data.local.entity.SupplierEntity
import com.example.gestionstock.data.repository.ProductRepository
import com.example.gestionstock.data.repository.StockEntryRepository
import com.example.gestionstock.data.repository.SupplierRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockEntriesScreen(
    stockEntryRepository: StockEntryRepository,
    productRepository: ProductRepository,
    supplierRepository: SupplierRepository
) {
    var entries by remember { mutableStateOf<List<StockEntryEntity>>(emptyList()) }
    var products by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    var suppliers by remember { mutableStateOf<List<SupplierEntity>>(emptyList()) }
    
    var showDialog by remember { mutableStateOf(false) }
    
    var selectedProductId by remember { mutableStateOf<Int?>(null) }
    var selectedProductName by remember { mutableStateOf("Choisir un produit") }
    var showProductDropdown by remember { mutableStateOf(false) }

    var selectedSupplierId by remember { mutableStateOf<Int?>(null) }
    var selectedSupplierName by remember { mutableStateOf("Choisir un fournisseur (facultatif)") }
    var showSupplierDropdown by remember { mutableStateOf(false) }

    var quantityStr by remember { mutableStateOf("") }
    var unitCostStr by remember { mutableStateOf("") }
    var noteStr by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            entries = stockEntryRepository.getAll().first()
            products = productRepository.getAll().first()
            suppliers = supplierRepository.getAll().first()
        }
    }

    LaunchedEffect(Unit) {
        load()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Approvisionnements", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        },
        floatingActionButton = {
            if (Session.isAdmin) {
                FloatingActionButton(
                    onClick = { showDialog = true },
                    containerColor = Color(0xFF00B4D8),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Nouvel approvisionnement")
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp)
        ) {
            val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

            if (entries.isEmpty()) {
                Text(
                    "Aucun approvisionnement enregistré.",
                    color = Color.Gray,
                    fontSize = 16.sp,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(entries) { entry ->
                        val productName = products.find { it.id == entry.productId }?.name ?: "Produit inconnu"
                        val supplierName = suppliers.find { it.id == entry.supplierId }?.name ?: "Aucun"
                        
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(productName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text(
                                        "+${entry.quantity}",
                                        color = Color(0xFF4CAF50),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Fournisseur: $supplierName", color = Color.Gray, fontSize = 12.sp)
                                    Text(sdf.format(Date(entry.createdAt)), color = Color.Gray, fontSize = 12.sp)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Coût unitaire: ${String.format(Locale.US, "%,.2f", entry.unitCost)} FCFA", color = Color.Gray, fontSize = 12.sp)
                                    Text(
                                        "Total: ${String.format(Locale.US, "%,.2f", entry.totalCost)} FCFA",
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                if (entry.notes.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Note: ${entry.notes}", color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            if (showDialog) {
                AlertDialog(
                    onDismissRequest = { showDialog = false },
                    title = { Text("Nouvel Approvisionnement", color = Color.White) },
                    containerColor = Color(0xFF1E293B),
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            val inputColors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF00B4D8),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )

                            // Product Dropdown
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = selectedProductName,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Produit *") },
                                    trailingIcon = {
                                        IconButton(onClick = { showProductDropdown = true }) {
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color.White)
                                        }
                                    },
                                    colors = inputColors,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                DropdownMenu(
                                    expanded = showProductDropdown,
                                    onDismissRequest = { showProductDropdown = false },
                                    modifier = Modifier
                                        .fillMaxWidth(0.9f)
                                        .background(Color(0xFF1E293B))
                                ) {
                                    products.forEach { product ->
                                        DropdownMenuItem(
                                            text = { Text(product.name, color = Color.White) },
                                            onClick = {
                                                selectedProductId = product.id
                                                selectedProductName = product.name
                                                showProductDropdown = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Supplier Dropdown
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = selectedSupplierName,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Fournisseur") },
                                    trailingIcon = {
                                        IconButton(onClick = { showSupplierDropdown = true }) {
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color.White)
                                        }
                                    },
                                    colors = inputColors,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                DropdownMenu(
                                    expanded = showSupplierDropdown,
                                    onDismissRequest = { showSupplierDropdown = false },
                                    modifier = Modifier
                                        .fillMaxWidth(0.9f)
                                        .background(Color(0xFF1E293B))
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Aucun", color = Color.White) },
                                        onClick = {
                                            selectedSupplierId = null
                                            selectedSupplierName = "Aucun"
                                            showSupplierDropdown = false
                                        }
                                    )
                                    suppliers.forEach { supplier ->
                                        DropdownMenuItem(
                                            text = { Text(supplier.name, color = Color.White) },
                                            onClick = {
                                                selectedSupplierId = supplier.id
                                                selectedSupplierName = supplier.name
                                                showSupplierDropdown = false
                                            }
                                        )
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = quantityStr,
                                    onValueChange = { quantityStr = it },
                                    label = { Text("Qté *") },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    colors = inputColors,
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = unitCostStr,
                                    onValueChange = { unitCostStr = it },
                                    label = { Text("Coût Unitaire *") },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    colors = inputColors,
                                    modifier = Modifier.weight(1.2f)
                                )
                            }

                            OutlinedTextField(
                                value = noteStr,
                                onValueChange = { noteStr = it },
                                label = { Text("Note / Observations") },
                                colors = inputColors,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                val productId = selectedProductId
                                val qty = quantityStr.toIntOrNull() ?: 0
                                val cost = unitCostStr.toDoubleOrNull() ?: 0.0

                                if (productId != null && qty > 0 && cost > 0.0) {
                                    scope.launch {
                                        // 1. Ajouter approvisionnement
                                        stockEntryRepository.insert(
                                            StockEntryEntity(
                                                productId = productId,
                                                supplierId = selectedSupplierId,
                                                quantity = qty,
                                                unitCost = cost,
                                                totalCost = qty * cost,
                                                notes = noteStr.trim()
                                            )
                                        )
                                        // 2. Mettre à jour stock produit
                                        productRepository.addStock(productId, qty)
                                        
                                        // Reset fields
                                        selectedProductId = null
                                        selectedProductName = "Choisir un produit"
                                        selectedSupplierId = null
                                        selectedSupplierName = "Choisir un fournisseur"
                                        quantityStr = ""
                                        unitCostStr = ""
                                        noteStr = ""
                                        showDialog = false
                                        load()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8))
                        ) {
                            Text("Confirmer", color = Color.White)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showDialog = false }) {
                            Text("Annuler", color = Color.Gray)
                        }
                    }
                )
            }
        }
    }
}
