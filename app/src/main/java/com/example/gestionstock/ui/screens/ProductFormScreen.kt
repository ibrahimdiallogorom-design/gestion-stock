package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.data.local.entity.CategoryEntity
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.repository.CategoryRepository
import com.example.gestionstock.data.repository.ProductRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormScreen(
    productId: Int, // -1 for New Product
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    
    var name by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf<Int?>(null) }
    var purchasePrice by remember { mutableStateOf("") }
    var salePrice by remember { mutableStateOf("") }
    var stockQuantity by remember { mutableStateOf("") }
    var minStockAlert by remember { mutableStateOf("5") }
    var unit by remember { mutableStateOf("pcs") }
    var description by remember { mutableStateOf("") }

    var categories by remember { mutableStateOf<List<CategoryEntity>>(emptyList()) }
    var selectedCategoryName by remember { mutableStateOf("Choisir une catégorie") }
    var showCategoryDropdown by remember { mutableStateOf(false) }
    
    var isEditMode by remember { mutableStateOf(false) }
    var existingProduct by remember { mutableStateOf<ProductEntity?>(null) }

    LaunchedEffect(productId) {
        scope.launch {
            categories = categoryRepository.getAll().first()
            if (productId != -1) {
                isEditMode = true
                val product = productRepository.getById(productId)
                if (product != null) {
                    existingProduct = product
                    name = product.name
                    reference = product.reference
                    categoryId = product.categoryId
                    purchasePrice = product.purchasePrice.toString()
                    salePrice = product.salePrice.toString()
                    stockQuantity = product.stockQuantity.toString()
                    minStockAlert = product.minStockAlert.toString()
                    unit = product.unit
                    description = product.description
                    
                    selectedCategoryName = categories.find { it.id == product.categoryId }?.name ?: "Choisir une catégorie"
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEditMode) "Modifier le Produit" else "Ajouter un Produit", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                    }
                },
                actions = {
                    if (isEditMode) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    existingProduct?.let {
                                        productRepository.delete(it)
                                        onNavigateBack()
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color.Red)
                        }
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            val fieldColors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF00B4D8),
                unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedLabelColor = Color(0xFF00B4D8),
                unfocusedLabelColor = Color.Gray
            )

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nom du produit *") },
                singleLine = true,
                colors = fieldColors,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = reference,
                onValueChange = { reference = it },
                label = { Text("Référence / Code Barre *") },
                singleLine = true,
                colors = fieldColors,
                modifier = Modifier.fillMaxWidth()
            )

            // Category Selector Dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = selectedCategoryName,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Catégorie") },
                    trailingIcon = {
                        IconButton(onClick = { showCategoryDropdown = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color.White)
                        }
                    },
                    colors = fieldColors,
                    modifier = Modifier.fillMaxWidth()
                )
                DropdownMenu(
                    expanded = showCategoryDropdown,
                    onDismissRequest = { showCategoryDropdown = false },
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .background(Color(0xFF1E293B))
                ) {
                    categories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.name, color = Color.White) },
                            onClick = {
                                categoryId = category.id
                                selectedCategoryName = category.name
                                showCategoryDropdown = false
                            }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = purchasePrice,
                    onValueChange = { purchasePrice = it },
                    label = { Text("Prix d'achat *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.weight(1f)
                )

                OutlinedTextField(
                    value = salePrice,
                    onValueChange = { salePrice = it },
                    label = { Text("Prix de vente *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = stockQuantity,
                    onValueChange = { stockQuantity = it },
                    label = { Text("Quantité initiale *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.weight(1f),
                    enabled = !isEditMode // Le stock doit être géré via les ventes et approvisionnements
                )

                OutlinedTextField(
                    value = minStockAlert,
                    onValueChange = { minStockAlert = it },
                    label = { Text("Stock critique min. *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("Unité de mesure") },
                    singleLine = true,
                    colors = fieldColors,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.weight(1f))
            }

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                minLines = 3,
                colors = fieldColors,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (name.isBlank() || reference.isBlank() || purchasePrice.isBlank() || salePrice.isBlank()) {
                        return@Button
                    }
                    scope.launch {
                        val pCost = purchasePrice.toDoubleOrNull() ?: 0.0
                        val pSale = salePrice.toDoubleOrNull() ?: 0.0
                        val qty = stockQuantity.toIntOrNull() ?: 0
                        val alert = minStockAlert.toIntOrNull() ?: 5

                        if (isEditMode && existingProduct != null) {
                            val updated = existingProduct!!.copy(
                                name = name.trim(),
                                reference = reference.trim(),
                                categoryId = categoryId,
                                purchasePrice = pCost,
                                salePrice = pSale,
                                minStockAlert = alert,
                                unit = unit.trim(),
                                description = description.trim(),
                                updatedAt = System.currentTimeMillis()
                            )
                            productRepository.update(updated)
                        } else {
                            val newProduct = ProductEntity(
                                name = name.trim(),
                                reference = reference.trim(),
                                categoryId = categoryId,
                                purchasePrice = pCost,
                                salePrice = pSale,
                                stockQuantity = qty,
                                minStockAlert = alert,
                                unit = unit.trim(),
                                description = description.trim()
                            )
                            productRepository.insert(newProduct)
                        }
                        onNavigateBack()
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("ENREGISTRER LE PRODUIT", fontWeight = FontWeight.Bold)
            }
        }
    }
}
