package com.gestionstock.app.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.gestionstock.app.data.local.dao.*
import com.gestionstock.app.data.local.entity.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        UserEntity::class,
        CategoryEntity::class,
        ProductEntity::class,
        SupplierEntity::class,
        SaleEntity::class,
        SaleItemEntity::class,
        StockEntryEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun supplierDao(): SupplierDao
    abstract fun saleDao(): SaleDao
    abstract fun saleItemDao(): SaleItemDao
    abstract fun stockEntryDao(): StockEntryDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "gestion_stock_db"
                )
                    .addCallback(object : Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            CoroutineScope(Dispatchers.IO).launch {
                                INSTANCE?.let { database ->
                                    // Insert default admin user (MD5 of "admin" = 21232f297a57a5a743894a0e4a801fc3)
                                    database.userDao().insert(
                                        UserEntity(
                                            username = "admin",
                                            password = "21232f297a57a5a743894a0e4a801fc3",
                                            role = "ADMIN",
                                            fullName = "Administrateur"
                                        )
                                    )
                                    // Insert default categories
                                    database.categoryDao().insert(CategoryEntity(name = "Général", colorHex = "#2196F3"))
                                    database.categoryDao().insert(CategoryEntity(name = "Alimentaire", colorHex = "#4CAF50"))
                                    database.categoryDao().insert(CategoryEntity(name = "Électronique", colorHex = "#FF9800"))
                                    database.categoryDao().insert(CategoryEntity(name = "Vêtements", colorHex = "#9C27B0"))
                                }
                            }
                        }
                    })
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
