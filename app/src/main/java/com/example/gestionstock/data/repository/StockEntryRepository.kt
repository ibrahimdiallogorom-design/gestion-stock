package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.StockEntryDao
import com.example.gestionstock.data.local.entity.StockEntryEntity
import kotlinx.coroutines.flow.Flow

class StockEntryRepository(private val dao: StockEntryDao) {
    fun getAll(): Flow<List<StockEntryEntity>> = dao.getAll()
    fun getByProduct(productId: Int): Flow<List<StockEntryEntity>> = dao.getByProduct(productId)
    suspend fun getByDateRange(start: Long, end: Long): List<StockEntryEntity> = dao.getByDateRange(start, end)
    suspend fun insert(entry: StockEntryEntity): Long = dao.insert(entry)
    suspend fun update(entry: StockEntryEntity) = dao.update(entry)
    suspend fun delete(entry: StockEntryEntity) = dao.delete(entry)
    suspend fun getTotalCostInRange(start: Long, end: Long): Double = dao.getTotalCostInRange(start, end)
}
