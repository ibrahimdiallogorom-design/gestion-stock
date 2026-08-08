package com.example.gestionstock.data.local.dao

import androidx.room.*
import com.example.gestionstock.data.local.entity.StockEntryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StockEntryDao {
    @Query("SELECT * FROM stock_entries ORDER BY createdAt DESC")
    fun getAll(): Flow<List<StockEntryEntity>>

    @Query("SELECT * FROM stock_entries WHERE productId = :productId ORDER BY createdAt DESC")
    fun getByProduct(productId: Int): Flow<List<StockEntryEntity>>

    @Query("SELECT * FROM stock_entries WHERE createdAt BETWEEN :start AND :end ORDER BY createdAt DESC")
    suspend fun getByDateRange(start: Long, end: Long): List<StockEntryEntity>

    @Insert
    suspend fun insert(entry: StockEntryEntity): Long

    @Update
    suspend fun update(entry: StockEntryEntity)

    @Delete
    suspend fun delete(entry: StockEntryEntity)

    @Query("SELECT COALESCE(SUM(totalCost), 0.0) FROM stock_entries WHERE createdAt BETWEEN :start AND :end")
    suspend fun getTotalCostInRange(start: Long, end: Long): Double
}
