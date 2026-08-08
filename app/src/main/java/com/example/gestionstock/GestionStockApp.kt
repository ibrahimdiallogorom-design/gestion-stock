package com.example.gestionstock

import android.app.Application
import com.example.gestionstock.data.local.database.AppDatabase
import com.example.gestionstock.data.repository.*

class GestionStockApp : Application() {
    val database by lazy { AppDatabase.getDatabase(this) }
    
    val userRepository by lazy { UserRepository(database.userDao()) }
    val categoryRepository by lazy { CategoryRepository(database.categoryDao()) }
    val productRepository by lazy { ProductRepository(database.productDao()) }
    val supplierRepository by lazy { SupplierRepository(database.supplierDao()) }
    val saleRepository by lazy { SaleRepository(database.saleDao(), database.saleItemDao()) }
    val stockEntryRepository by lazy { StockEntryRepository(database.stockEntryDao()) }

    override fun onCreate() {
        super.onCreate()
    }
}
