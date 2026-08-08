package com.gestionstock.app.data.local.dao

import androidx.room.*
import com.gestionstock.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAll(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE categoryId = :categoryId ORDER BY name ASC")
    fun getByCategory(categoryId: Int): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE stockQuantity <= minStockAlert ORDER BY stockQuantity ASC")
    fun getLowStockProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%' OR reference LIKE '%' || :query || '%' ORDER BY name ASC")
    fun search(query: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: Int): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity): Long

    @Update
    suspend fun update(product: ProductEntity)

    @Delete
    suspend fun delete(product: ProductEntity)

    @Query("UPDATE products SET stockQuantity = stockQuantity + :quantity, updatedAt = :now WHERE id = :id")
    suspend fun addStock(id: Int, quantity: Int, now: Long = System.currentTimeMillis())

    @Query("UPDATE products SET stockQuantity = stockQuantity - :quantity, updatedAt = :now WHERE id = :id")
    suspend fun removeStock(id: Int, quantity: Int, now: Long = System.currentTimeMillis())

    @Query("SELECT COUNT(*) FROM products")
    suspend fun getCount(): Int

    @Query("SELECT SUM(CAST(stockQuantity AS REAL) * purchasePrice) FROM products")
    suspend fun getTotalStockValue(): Double?

    @Query("SELECT COUNT(*) FROM products WHERE stockQuantity <= minStockAlert")
    suspend fun getLowStockCount(): Int
}
