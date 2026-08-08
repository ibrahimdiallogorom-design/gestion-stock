package com.example.gestionstock.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.SupplierEntity
import com.example.gestionstock.data.repository.SupplierRepository
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuppliersScreen(supplierRepository: SupplierRepository) {
    var suppliers by remember { mutableStateOf<List<SupplierEntity>>(emptyList()) }
    var showDialog by remember { mutableStateOf(false) }
    
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            suppliers = supplierRepository.getAll().first()
        }
    }

    LaunchedEffect(Unit) {
        load()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fournisseurs", fontWeight = FontWeight.Bold, color = Color.White) },
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
                    Icon(Icons.Default.Add, contentDescription = "Nouveau fournisseur")
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
            if (suppliers.isEmpty()) {
                Text(
                    "Aucun fournisseur configuré.",
                    color = Color.Gray,
                    fontSize = 16.sp,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(suppliers) { supplier ->
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
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(supplier.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    if (Session.isAdmin) {
                                        IconButton(
                                            onClick = {
                                                scope.launch {
                                                    supplierRepository.delete(supplier)
                                                    load()
                                                }
                                            }
                                        ) {
                                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color.Red)
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                if (supplier.phone.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                                        Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF00B4D8), modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(supplier.phone, color = Color.Gray, fontSize = 14.sp)
                                    }
                                }
                                if (supplier.email.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                                        Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF00B4D8), modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(supplier.email, color = Color.Gray, fontSize = 14.sp)
                                    }
                                }
                                if (supplier.address.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF00B4D8), modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(supplier.address, color = Color.Gray, fontSize = 14.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (showDialog) {
                AlertDialog(
                    onDismissRequest = { showDialog = false },
                    title = { Text("Nouveau Fournisseur", color = Color.White) },
                    containerColor = Color(0xFF1E293B),
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            val inputColors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFF00B4D8),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )

                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                label = { Text("Nom complet *") },
                                colors = inputColors,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = { Text("Téléphone") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                colors = inputColors,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("E-mail") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                colors = inputColors,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = address,
                                onValueChange = { address = it },
                                label = { Text("Adresse") },
                                colors = inputColors,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                if (name.isNotBlank()) {
                                    scope.launch {
                                        supplierRepository.insert(
                                            SupplierEntity(
                                                name = name.trim(),
                                                phone = phone.trim(),
                                                email = email.trim(),
                                                address = address.trim()
                                            )
                                        )
                                        name = ""
                                        phone = ""
                                        email = ""
                                        address = ""
                                        showDialog = false
                                        load()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8))
                        ) {
                            Text("Ajouter", color = Color.White)
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
