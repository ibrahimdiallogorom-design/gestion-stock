package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.example.gestionstock.data.local.entity.SaleEntity
import com.example.gestionstock.data.local.entity.SaleItemEntity
import com.example.gestionstock.data.repository.ProductRepository
import com.example.gestionstock.data.repository.SaleRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.Locale

data class CartItem(
    val product: ProductEntity,
    val quantity: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSaleScreen(
    productRepository: ProductRepository,
    saleRepository: SaleRepository,
    onSaleSuccess: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf("") }
    var availableProducts by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    val cartItems = remember { mutableStateListOf<CartItem>() }
    
    var discountText by remember { mutableStateOf("0") }
    var taxText by remember { mutableStateOf("0") } // TVA en %
    var noteText by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("CASH") }
    
    var showCheckoutDialog by remember { mutableStateOf(false) }
    var showProductSearch by remember { mutableStateOf(true) }

    LaunchedEffect(searchQuery) {
        scope.launch {
            if (searchQuery.isNotBlank()) {
                productRepository.search(searchQuery).collect { list ->
                    availableProducts = list.filter { it.stockQuantity > 0 }
                }
            } else {
                productRepository.getAll().collect { list ->
                    availableProducts = list.filter { it.stockQuantity > 0 }
                }
            }
        }
    }

    val subtotal = cartItems.sumOf { it.product.salePrice * it.quantity }
    val discount = discountText.toDoubleOrNull() ?: 0.0
    val taxRate = (taxText.toDoubleOrNull() ?: 0.0) / 100.0
    val taxAmount = (subtotal - discount) * taxRate
    val grandTotal = (subtotal - discount) + taxAmount

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nouvelle Vente", fontWeight = FontWeight.Bold, color = Color.White) },
                actions = {
                    TextButton(onClick = { cartItems.clear() }) {
                        Text("Vider", color = Color.Red)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3A5F))
            )
        }
    ) { paddingValues ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
                .padding(8.dp)
        ) {
            // Left Side: Product Selector or Cart depending on screen size, here we split 50/50
            Column(
                modifier = Modifier
                    .weight(1.1f)
                    .fillMaxHeight()
                    .padding(4.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Scanner ou chercher...", color = Color.Gray) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF00B4D8),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(availableProducts) { product ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val existing = cartItems.find { it.product.id == product.id }
                                    if (existing != null) {
                                        if (existing.quantity < product.stockQuantity) {
                                            val index = cartItems.indexOf(existing)
                                            cartItems[index] = existing.copy(quantity = existing.quantity + 1)
                                        }
                                    } else {
                                        cartItems.add(CartItem(product, 1))
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(product.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Stock: ${product.stockQuantity} | Réf: ${product.reference}", color = Color.Gray, fontSize = 12.sp)
                                }
                                Text(
                                    "${String.format(Locale.US, "%,.2f", product.salePrice)} FCFA",
                                    color = Color(0xFF00B4D8),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            Divider(
                color = Color.White.copy(alpha = 0.1f),
                modifier = Modifier
                    .fillMaxHeight()
                    .width(1.dp)
                    .padding(horizontal = 4.dp)
            )

            // Right Side: Cart and Checkout Summary
            Column(
                modifier = Modifier
                    .weight(0.9f)
                    .fillMaxHeight()
                    .padding(4.dp)
            ) {
                Text("Panier", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(bottom = 8.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(cartItems) { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.product.name, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Text("${String.format(Locale.US, "%.2f", item.product.salePrice)} FCFA", color = Color.Gray, fontSize = 11.sp)
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                IconButton(
                                    onClick = {
                                        if (item.quantity > 1) {
                                            val index = cartItems.indexOf(item)
                                            cartItems[index] = item.copy(quantity = item.quantity - 1)
                                        } else {
                                            cartItems.remove(item)
                                        }
                                    },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Remove, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                }
                                Text("${item.quantity}", color = Color.White, fontWeight = FontWeight.Bold)
                                IconButton(
                                    onClick = {
                                        if (item.quantity < item.product.stockQuantity) {
                                            val index = cartItems.indexOf(item)
                                            cartItems[index] = item.copy(quantity = item.quantity + 1)
                                        }
                                    },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Totals & Checkout
                Column(
                    modifier = Modifier
                        .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Sous-total", color = Color.Gray, fontSize = 14.sp)
                        Text("${String.format(Locale.US, "%,.2f", subtotal)} FCFA", color = Color.White, fontSize = 14.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Remise (FCFA)", color = Color.Gray, fontSize = 14.sp)
                        BasicTextField(
                            value = discountText,
                            onValueChange = { discountText = it },
                            textStyle = LocalTextStyle.current.copy(color = Color.White, fontSize = 14.sp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier
                                .width(60.dp)
                                .background(Color(0xFF0F172A), RoundedCornerShape(4.dp))
                                .padding(4.dp)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("TVA (%)", color = Color.Gray, fontSize = 14.sp)
                        BasicTextField(
                            value = taxText,
                            onValueChange = { taxText = it },
                            textStyle = LocalTextStyle.current.copy(color = Color.White, fontSize = 14.sp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier
                                .width(60.dp)
                                .background(Color(0xFF0F172A), RoundedCornerShape(4.dp))
                                .padding(4.dp)
                        )
                    }

                    Divider(color = Color.White.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("TOTAL", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(
                            "${String.format(Locale.US, "%,.2f", grandTotal)} FCFA",
                            color = Color(0xFF4CAF50),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            if (cartItems.size > 0) {
                                showCheckoutDialog = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("ENCAISSER", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Checkout / Payment dialog
        if (showCheckoutDialog) {
            AlertDialog(
                onDismissRequest = { showCheckoutDialog = false },
                title = { Text("Finaliser la Vente", color = Color.White) },
                containerColor = Color(0xFF1E293B),
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Montant à payer : ${String.format(Locale.US, "%,.2f", grandTotal)} FCFA", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        
                        Text("Mode de paiement", color = Color.Gray, fontSize = 14.sp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("CASH", "CARD", "VIREMENT").forEach { method ->
                                FilterChip(
                                    selected = paymentMethod == method,
                                    onClick = { paymentMethod = method },
                                    label = { Text(method) }
                                )
                            }
                        }

                        OutlinedTextField(
                            value = noteText,
                            onValueChange = { noteText = it },
                            label = { Text("Note de vente", color = Color.Gray) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF00B4D8),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            scope.launch {
                                val sale = SaleEntity(
                                    userId = Session.currentUser.value?.id ?: 1,
                                    totalAmount = grandTotal,
                                    discountAmount = discount,
                                    taxRate = taxRate,
                                    paymentMethod = paymentMethod,
                                    notes = noteText
                                )
                                val saleId = saleRepository.insertSale(sale).toInt()

                                val itemsToInsert = cartItems.map { item ->
                                    SaleItemEntity(
                                        saleId = saleId,
                                        productId = item.product.id,
                                        productName = item.product.name,
                                        quantity = item.quantity,
                                        unitPrice = item.product.salePrice,
                                        totalPrice = item.product.salePrice * item.quantity
                                    )
                                }
                                saleRepository.insertSaleItems(itemsToInsert)

                                // Mettre à jour les stocks dans la coroutine
                                cartItems.forEach { item ->
                                    productRepository.removeStock(item.product.id, item.quantity)
                                }
                                
                                showCheckoutDialog = false
                                cartItems.clear()
                                onSaleSuccess()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                    ) {
                        Text("Confirmer", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showCheckoutDialog = false }) {
                        Text("Annuler", color = Color.Gray)
                    }
                }
            )
        }
    }
}

// Basic text field implementation
@Composable
fun BasicTextField(
    value: String,
    onValueChange: (String) -> Unit,
    textStyle: androidx.compose.ui.text.TextStyle,
    keyboardOptions: KeyboardOptions,
    modifier: Modifier
) {
    androidx.compose.foundation.text.BasicTextField(
        value = value,
        onValueChange = onValueChange,
        textStyle = textStyle,
        keyboardOptions = keyboardOptions,
        modifier = modifier
    )
}
