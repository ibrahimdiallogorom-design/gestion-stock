package com.example.gestionstock.data.local.dao

import androidx.room.*
import com.example.gestionstock.data.local.entity.SaleItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SaleItemDao {
    @Query("SELECT * FROM sale_items WHERE saleId = :saleId")
    suspend fun getBySaleId(saleId: Int): List<SaleItemEntity>

    @Query("SELECT * FROM sale_items WHERE saleId = :saleId")
    fun getBySaleIdFlow(saleId: Int): Flow<List<SaleItemEntity>>

    @Insert
    suspend fun insertAll(items: List<SaleItemEntity>)

    @Insert
    suspend fun insert(item: SaleItemEntity): Long

    @Query("""
        SELECT productId, productName, SUM(quantity) as totalQty, SUM(totalPrice) as totalRevenue
        FROM sale_items
        WHERE saleId IN (
            SELECT id FROM sales WHERE createdAt BETWEEN :start AND :end AND status = 'COMPLETED'
        )
        GROUP BY productId
        ORDER BY totalQty DESC
        LIMIT :limit
    """)
    suspend fun getTopProducts(start: Long, end: Long, limit: Int = 10): List<TopProductResult>
}

data class TopProductResult(
    val productId: Int,
    val productName: String,
    val totalQty: Int,
    val totalRevenue: Double
)
