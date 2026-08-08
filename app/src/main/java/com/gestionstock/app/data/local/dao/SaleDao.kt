package com.gestionstock.app.data.local.dao

import androidx.room.*
import com.gestionstock.app.data.local.entity.SaleEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SaleDao {
    @Query("SELECT * FROM sales ORDER BY createdAt DESC")
    fun getAll(): Flow<List<SaleEntity>>

    @Query("SELECT * FROM sales WHERE createdAt BETWEEN :startDate AND :endDate ORDER BY createdAt DESC")
    fun getSalesByDateRange(startDate: Long, endDate: Long): Flow<List<SaleEntity>>

    @Query("SELECT * FROM sales WHERE strftime('%Y-%m', datetime(createdAt/1000, 'unixepoch')) = :yearMonth ORDER BY createdAt DESC")
    fun getSalesByMonth(yearMonth: String): Flow<List<SaleEntity>>

    @Query("SELECT COALESCE(SUM(totalAmount), 0.0) FROM sales WHERE createdAt >= :startOfDay AND status = 'COMPLETED'")
    suspend fun getTotalSalesToday(startOfDay: Long): Double

    @Query("SELECT COALESCE(SUM(totalAmount), 0.0) FROM sales WHERE createdAt BETWEEN :start AND :end AND status = 'COMPLETED'")
    suspend fun getTotalSalesInRange(start: Long, end: Long): Double

    @Query("SELECT COUNT(*) FROM sales WHERE createdAt >= :startOfDay AND status = 'COMPLETED'")
    suspend fun getCountToday(startOfDay: Long): Int

    @Insert
    suspend fun insert(sale: SaleEntity): Long

    @Update
    suspend fun update(sale: SaleEntity)

    @Query("SELECT * FROM sales WHERE id = :id")
    suspend fun getById(id: Int): SaleEntity?

    @Query("SELECT * FROM sales WHERE status = 'COMPLETED' AND createdAt BETWEEN :start AND :end ORDER BY createdAt DESC")
    suspend fun getCompletedSalesInRange(start: Long, end: Long): List<SaleEntity>
}
