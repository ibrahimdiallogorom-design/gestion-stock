package com.example.gestionstock

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.gestionstock.ui.screens.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val app = context.applicationContext as GestionStockApp
    
    val currentUserState = Session.currentUser.collectAsState()
    val currentUser = currentUserState.value

    if (currentUser == null) {
        // Enforce Login Screen
        LoginScreen(
            userRepository = app.userRepository,
            onLoginSuccess = {
                navController.navigate("dashboard") {
                    popUpTo(0)
                }
            }
        )
    } else {
        Scaffold(
            bottomBar = {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route
                
                NavigationBar(
                    containerColor = Color(0xFF1E293B),
                    contentColor = Color.White
                ) {
                    if (Session.isAdmin) {
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Dashboard, contentDescription = null) },
                            label = { Text("Dashboard", color = Color.White) },
                            selected = currentRoute == "dashboard",
                            onClick = { navController.navigate("dashboard") }
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Inventory, contentDescription = null) },
                            label = { Text("Produits", color = Color.White) },
                            selected = currentRoute?.startsWith("products") == true || currentRoute?.startsWith("product_form") == true,
                            onClick = { navController.navigate("products") }
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.AddShoppingCart, contentDescription = null) },
                            label = { Text("POS / Vente", color = Color.White) },
                            selected = currentRoute == "new_sale",
                            onClick = { navController.navigate("new_sale") }
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Category, contentDescription = null) },
                            label = { Text("Catégories", color = Color.White) },
                            selected = currentRoute == "categories",
                            onClick = { navController.navigate("categories") }
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.ListAlt, contentDescription = null) },
                            label = { Text("Plus", color = Color.White) },
                            selected = currentRoute == "more",
                            onClick = { navController.navigate("more") }
                        )
                    } else {
                        // Caissier only sees POS and Settings
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.AddShoppingCart, contentDescription = null) },
                            label = { Text("POS / Vente", color = Color.White) },
                            selected = currentRoute == "new_sale",
                            onClick = { navController.navigate("new_sale") }
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                            label = { Text("Paramètres", color = Color.White) },
                            selected = currentRoute == "settings",
                            onClick = { navController.navigate("settings") }
                        )
                    }
                }
            }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = if (Session.isAdmin) "dashboard" else "new_sale",
                modifier = Modifier.padding(paddingValues)
            ) {
                composable("dashboard") {
                    DashboardScreen(
                        productRepository = app.productRepository,
                        saleRepository = app.saleRepository,
                        onNavigateToSales = { navController.navigate("sales_history") },
                        onNavigateToProducts = { navController.navigate("products") }
                    )
                }

                composable("products") {
                    ProductsScreen(
                        productRepository = app.productRepository,
                        categoryRepository = app.categoryRepository,
                        onAddProductClick = { navController.navigate("product_form/-1") },
                        onProductEditClick = { id -> navController.navigate("product_form/$id") }
                    )
                }

                composable(
                    route = "product_form/{productId}",
                    arguments = listOf(navArgument("productId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val productId = backStackEntry.arguments?.getInt("productId") ?: -1
                    ProductFormScreen(
                        productId = productId,
                        productRepository = app.productRepository,
                        categoryRepository = app.categoryRepository,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable("new_sale") {
                    NewSaleScreen(
                        productRepository = app.productRepository,
                        saleRepository = app.saleRepository,
                        onSaleSuccess = {
                            Toast.makeText(context, "Vente enregistrée avec succès !", Toast.LENGTH_SHORT).show()
                            navController.navigate(if (Session.isAdmin) "dashboard" else "new_sale") {
                                popUpTo(0)
                            }
                        }
                    )
                }

                composable("categories") {
                    CategoriesScreen(categoryRepository = app.categoryRepository)
                }

                composable("more") {
                    MoreMenuScreen(
                        onNavigate = { route -> navController.navigate(route) }
                    )
                }

                composable("sales_history") {
                    SalesHistoryScreen(
                        saleRepository = app.saleRepository,
                        onSaleClick = { id -> navController.navigate("sale_detail/$id") }
                    )
                }

                composable(
                    route = "sale_detail/{saleId}",
                    arguments = listOf(navArgument("saleId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val saleId = backStackEntry.arguments?.getInt("saleId") ?: -1
                    SaleDetailScreen(
                        saleId = saleId,
                        saleRepository = app.saleRepository,
                        productRepository = app.productRepository,
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                composable("suppliers") {
                    SuppliersScreen(supplierRepository = app.supplierRepository)
                }

                composable("stock_entries") {
                    StockEntriesScreen(
                        stockEntryRepository = app.stockEntryRepository,
                        productRepository = app.productRepository,
                        supplierRepository = app.supplierRepository
                    )
                }

                composable("reports") {
                    ReportsScreen(
                        saleRepository = app.saleRepository,
                        productRepository = app.productRepository,
                        stockEntryRepository = app.stockEntryRepository
                    )
                }

                composable("settings") {
                    SettingsScreen(
                        userRepository = app.userRepository,
                        onLogoutClick = {
                            navController.navigate("dashboard") {
                                popUpTo(0)
                            }
                        }
                    )
                }
            }
        }
    }
}
