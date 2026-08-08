package com.example.gestionstock.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.gestionstock.data.local.dao.*
import com.example.gestionstock.data.local.entity.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.security.MessageDigest

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
    version = 3,
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

        fun md5(input: String): String {
            val md = MessageDigest.getInstance("MD5")
            val digest = md.digest(input.toByteArray())
            return digest.joinToString("") { "%02x".format(it) }
        }

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "gestion_stock_db"
                )
                .fallbackToDestructiveMigration()
                .addCallback(object : Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        super.onCreate(db)
                        // Seed database synchronously using raw SQL to avoid thread blocks or null references during creation
                        val now = System.currentTimeMillis()
                        val adminPw = md5("admin")
                        val caissierPw = md5("caissier")
                        
                        db.execSQL("INSERT INTO users (username, password, role, fullName, isActive, createdAt) VALUES ('admin', '$adminPw', 'ADMIN', 'Administrateur', 1, $now)")
                        db.execSQL("INSERT INTO users (username, password, role, fullName, isActive, createdAt) VALUES ('caissier', '$caissierPw', 'CAISSIER', 'Caissier Principal', 1, $now)")
                        
                        db.execSQL("INSERT INTO categories (name, colorHex, description) VALUES ('Alimentation', '#4CAF50', '')")
                        db.execSQL("INSERT INTO categories (name, colorHex, description) VALUES ('Électronique', '#2196F3', '')")
                        db.execSQL("INSERT INTO categories (name, colorHex, description) VALUES ('Vêtements', '#9C27B0', '')")
                        db.execSQL("INSERT INTO categories (name, colorHex, description) VALUES ('Hygiène', '#00BCD4', '')")
                        db.execSQL("INSERT INTO categories (name, colorHex, description) VALUES ('Autres', '#FF9800', '')")
                    }

                    override fun onOpen(db: SupportSQLiteDatabase) {
                        super.onOpen(db)
                        // Safety check on open: ensure default users exist if table is empty
                        val now = System.currentTimeMillis()
                        val adminPw = md5("admin")
                        val caissierPw = md5("caissier")
                        
                        db.execSQL("INSERT OR IGNORE INTO users (id, username, password, role, fullName, isActive, createdAt) VALUES (1, 'admin', '$adminPw', 'ADMIN', 'Administrateur', 1, $now)")
                        db.execSQL("INSERT OR IGNORE INTO users (id, username, password, role, fullName, isActive, createdAt) VALUES (2, 'caissier', '$caissierPw', 'CAISSIER', 'Caissier Principal', 1, $now)")
                    }
                })
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
