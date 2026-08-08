package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.CategoryEntity
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.repository.CategoryRepository
import com.example.gestionstock.data.repository.ProductRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    onAddProductClick: () -> Unit,
    onProductEditClick: (Int) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var products by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    var categories by remember { mutableStateOf<List<CategoryEntity>>(emptyList()) }
    var selectedCategoryId by remember { mutableStateOf<Int?>(null) }
    var showFilterMenu by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    fun loadProducts() {
        scope.launch {
            categories = categoryRepository.getAll().first()
            
            if (searchQuery.isNotBlank()) {
                productRepository.search(searchQuery).collect { list ->
                    products = if (selectedCategoryId != null) {
                        list.filter { it.categoryId == selectedCategoryId }
                    } else {
                        list
                    }
                }
            } else if (selectedCategoryId != null) {
                productRepository.getByCategory(selectedCategoryId!!).collect { list ->
                    products = list
                }
            } else {
                productRepository.getAll().collect { list ->
                    products = list
                }
            }
        }
    }

    LaunchedEffect(searchQuery, selectedCategoryId) {
        loadProducts()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventaire Produits", fontWeight = FontWeight.Bold, color = Color.White) },
                actions = {
                    IconButton(onClick = { showFilterMenu = true }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filtrer", tint = Color.White)
                    }
                    DropdownMenu(
                        expanded = showFilterMenu,
                        onDismissRequest = { showFilterMenu = false },
                        modifier = Modifier.background(Color(0xFF1E293B))
                    ) {
                        DropdownMenuItem(
                            text = { Text("Toutes catégories", color = Color.White) },
                            onClick = {
                                selectedCategoryId = null
                                showFilterMenu = false
                            }
                        )
                        categories.forEach { category ->
                            DropdownMenuItem(
                                text = { Text(category.name, color = Color.White) },
                                onClick = {
                                    selectedCategoryId = category.id
                                    showFilterMenu = false
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        },
        floatingActionButton = {
            if (Session.isAdmin) {
                FloatingActionButton(
                    onClick = onAddProductClick,
                    containerColor = Color(0xFF00B4D8),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Ajouter Produit")
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(16.dp)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Rechercher par nom ou référence...", color = Color.Gray) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Effacer", tint = Color.Gray)
                        }
                    }
                },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF00B4D8),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Active category indicator
            if (selectedCategoryId != null) {
                val catName = categories.find { it.id == selectedCategoryId }?.name ?: ""
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Filtre: $catName",
                        color = Color(0xFF00B4D8),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { selectedCategoryId = null },
                        modifier = Modifier.size(18.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Enlever filtre", tint = Color.Red)
                    }
                }
            }

            // Products List
            if (products.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Aucun produit trouvé.", color = Color.Gray, fontSize = 16.sp)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(products) { product ->
                        val isLowStock = product.stockQuantity <= product.minStockAlert
                        val catName = categories.find { it.id == product.categoryId }?.name ?: "Non classé"
                        
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (Session.isAdmin) {
                                        onProductEditClick(product.id)
                                    }
                                },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isLowStock) Color(0xFF451A1A) else Color(0xFF1E293B)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            product.name,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp
                                        )
                                        Text(
                                            "Réf: ${product.reference} | $catName",
                                            color = Color.Gray,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Text(
                                        "${String.format(Locale.US, "%,.2f", product.salePrice)} FCFA",
                                        color = Color(0xFF00B4D8),
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp
                                    )
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Inventory,
                                            contentDescription = null,
                                            tint = if (isLowStock) Color(0xFFFF5252) else Color.White,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            "Stock: ${product.stockQuantity} ${product.unit}",
                                            color = if (isLowStock) Color(0xFFFF5252) else Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                    if (isLowStock) {
                                        Text(
                                            "Alerte (Seuil: ${product.minStockAlert})",
                                            color = Color(0xFFFF5252),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
