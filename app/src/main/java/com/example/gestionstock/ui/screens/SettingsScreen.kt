package com.example.gestionstock.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gestionstock.Session
import com.example.gestionstock.data.local.entity.UserEntity
import com.example.gestionstock.data.repository.UserRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userRepository: UserRepository,
    onLogoutClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val currentUser = Session.currentUser.collectAsState().value
    val usersList by userRepository.getAllUsers().collectAsState(initial = emptyList())

    // Profile inputs state
    var profileUsername by remember(currentUser) { mutableStateOf(currentUser?.username ?: "") }
    var profileFullName by remember(currentUser) { mutableStateOf(currentUser?.fullName ?: "") }
    var profilePassword by remember { mutableStateOf("") }

    // Dialog Add/Edit User state
    var showUserDialog by remember { mutableStateOf(false) }
    var editingUser by remember { mutableStateOf<UserEntity?>(null) }
    var dialogUsername by remember { mutableStateOf("") }
    var dialogFullName by remember { mutableStateOf("") }
    var dialogRole by remember { mutableStateOf("CAISSIER") }
    var dialogPassword by remember { mutableStateOf("") }

    // Dialog helper to open for edit
    fun openUserEdit(user: UserEntity) {
        editingUser = user
        dialogUsername = user.username
        dialogFullName = user.fullName
        dialogRole = user.role
        dialogPassword = "" // Leave empty by default
        showUserDialog = true
    }

    // Dialog helper to open for add
    fun openUserAdd() {
        editingUser = null
        dialogUsername = ""
        dialogFullName = ""
        dialogRole = "CAISSIER"
        dialogPassword = ""
        showUserDialog = true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paramètres", fontWeight = FontWeight.Bold, color = Color.White) },
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
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // SECTION: MY PROFILE / USER INFO
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Mon Profil",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        if (Session.isAdmin) {
                            OutlinedTextField(
                                value = profileUsername,
                                onValueChange = { profileUsername = it },
                                label = { Text("Identifiant (username)") },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF0ea5e9),
                                    unfocusedBorderColor = Color.Gray,
                                    focusedLabelColor = Color(0xFF0ea5e9),
                                    unfocusedLabelColor = Color.Gray
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = profileFullName,
                                onValueChange = { profileFullName = it },
                                label = { Text("Nom complet") },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF0ea5e9),
                                    unfocusedBorderColor = Color.Gray,
                                    focusedLabelColor = Color(0xFF0ea5e9),
                                    unfocusedLabelColor = Color.Gray
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = profilePassword,
                                onValueChange = { profilePassword = it },
                                label = { Text("Nouveau Mot de Passe (optionnel)") },
                                visualTransformation = PasswordVisualTransformation(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF0ea5e9),
                                    unfocusedBorderColor = Color.Gray,
                                    focusedLabelColor = Color(0xFF0ea5e9),
                                    unfocusedLabelColor = Color.Gray
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = {
                                    if (profileUsername.isBlank() || profileFullName.isBlank()) {
                                        Toast.makeText(context, "Veuillez remplir tous les champs obligatoires", Toast.LENGTH_SHORT).show()
                                        return@Button
                                    }
                                    scope.launch {
                                        currentUser?.let { user ->
                                            val updatedUser = if (profilePassword.isNotEmpty()) {
                                                user.copy(
                                                    username = profileUsername.trim(),
                                                    fullName = profileFullName.trim(),
                                                    password = com.example.gestionstock.data.local.database.AppDatabase.md5(profilePassword.trim())
                                                )
                                            } else {
                                                user.copy(
                                                    username = profileUsername.trim(),
                                                    fullName = profileFullName.trim()
                                                )
                                            }
                                            userRepository.update(updatedUser)
                                            Session.login(updatedUser)
                                            Toast.makeText(context, "Profil mis à jour !", Toast.LENGTH_SHORT).show()
                                            profilePassword = ""
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0ea5e9)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("METTRE À JOUR MON PROFIL", fontWeight = FontWeight.Bold)
                            }
                        } else {
                            // Read-only view for Cashier
                            Text("Identifiant de connexion : ${currentUser?.username ?: ""}", color = Color.LightGray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Nom complet : ${currentUser?.fullName ?: ""}", color = Color.LightGray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Rôle : ${currentUser?.role ?: ""}", color = Color.LightGray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Seul l'administrateur est habilité à modifier vos données d'accès.", color = Color.Gray, fontSize = 12.sp)
                        }
                    }
                }
            }

            // SECTION: USER ACCOUNTS (ADMIN ONLY)
            if (Session.isAdmin) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Gestion des Utilisateurs",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp
                                )
                                IconButton(
                                    onClick = { openUserAdd() },
                                    colors = IconButtonDefaults.iconButtonColors(contentColor = Color(0xFF0ea5e9))
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = "Ajouter un utilisateur")
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))

                            // List of users inline
                            usersList.forEach { user ->
                                val isSelf = user.username == currentUser?.username
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(user.fullName, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                        Text("Role: ${user.role} | Username: ${user.username}", color = Color.Gray, fontSize = 12.sp)
                                    }
                                    Row {
                                        IconButton(onClick = { openUserEdit(user) }) {
                                            Icon(Icons.Default.Edit, contentDescription = "Éditer", tint = Color(0xFF0ea5e9))
                                        }
                                        if (!isSelf) {
                                            IconButton(
                                                onClick = {
                                                    scope.launch {
                                                        userRepository.deactivate(user.id)
                                                        Toast.makeText(context, "Utilisateur supprimé !", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            ) {
                                                Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = Color.Red)
                                            }
                                        }
                                    }
                                }
                                Divider(color = Color.White.copy(alpha = 0.05f))
                            }
                        }
                    }
                }
            }

            // LOGOUT BUTTON
            item {
                Button(
                    onClick = {
                        Session.logout()
                        onLogoutClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFef4444)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("SE DÉCONNECTER", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }

    // DIALOG: ADD/EDIT USER
    if (showUserDialog) {
        AlertDialog(
            onDismissRequest = { showUserDialog = false },
            containerColor = Color(0xFF1E293B),
            title = {
                Text(
                    text = if (editingUser != null) "Modifier l'utilisateur" else "Ajouter un utilisateur",
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = dialogUsername,
                        onValueChange = { dialogUsername = it },
                        label = { Text("Identifiant (username) *") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF0ea5e9),
                            unfocusedBorderColor = Color.Gray,
                            focusedLabelColor = Color(0xFF0ea5e9),
                            unfocusedLabelColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = dialogFullName,
                        onValueChange = { dialogFullName = it },
                        label = { Text("Nom complet *") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF0ea5e9),
                            unfocusedBorderColor = Color.Gray,
                            focusedLabelColor = Color(0xFF0ea5e9),
                            unfocusedLabelColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Role selection drop-down simplified using tabs or buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Rôle :", color = Color.Gray, modifier = Modifier.weight(1f))
                        Button(
                            onClick = { dialogRole = "CAISSIER" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (dialogRole == "CAISSIER") Color(0xFF0ea5e9) else Color(0xFF334155)
                            )
                        ) {
                            Text("Caissier", fontSize = 12.sp)
                        }
                        Button(
                            onClick = { dialogRole = "ADMIN" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (dialogRole == "ADMIN") Color(0xFF0ea5e9) else Color(0xFF334155)
                            )
                        ) {
                            Text("Admin", fontSize = 12.sp)
                        }
                    }

                    OutlinedTextField(
                        value = dialogPassword,
                        onValueChange = { dialogPassword = it },
                        label = {
                            Text(
                                if (editingUser != null) "Nouveau Mot de Passe (optionnel)" else "Mot de passe *"
                            )
                        },
                        visualTransformation = PasswordVisualTransformation(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF0ea5e9),
                            unfocusedBorderColor = Color.Gray,
                            focusedLabelColor = Color(0xFF0ea5e9),
                            unfocusedLabelColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (dialogUsername.isBlank() || dialogFullName.isBlank() || (editingUser == null && dialogPassword.isBlank())) {
                            Toast.makeText(context, "Veuillez remplir tous les champs obligatoires", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        scope.launch {
                            val userToSave = editingUser?.copy(
                                username = dialogUsername.trim(),
                                fullName = dialogFullName.trim(),
                                role = dialogRole
                            )?.let { user ->
                                if (dialogPassword.isNotEmpty()) {
                                    user.copy(password = com.example.gestionstock.data.local.database.AppDatabase.md5(dialogPassword.trim()))
                                } else {
                                    user
                                }
                            } ?: UserEntity(
                                username = dialogUsername.trim(),
                                fullName = dialogFullName.trim(),
                                role = dialogRole,
                                password = "" // Set hashed by repo
                            )

                            if (editingUser != null) {
                                userRepository.update(userToSave)
                                Toast.makeText(context, "Utilisateur mis à jour !", Toast.LENGTH_SHORT).show()
                            } else {
                                userRepository.insert(userToSave, dialogPassword.trim())
                                Toast.makeText(context, "Utilisateur créé !", Toast.LENGTH_SHORT).show()
                            }
                            showUserDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10b981))
                ) {
                    Text("Enregistrer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUserDialog = false }) {
                    Text("Annuler", color = Color.Gray)
                }
            }
        )
    }
}
