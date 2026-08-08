package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.StockEntryDao
import com.gestionstock.app.data.local.entity.StockEntryEntity
import kotlinx.coroutines.flow.Flow

class StockEntryRepository(private val stockEntryDao: StockEntryDao) {

    fun getAll(): Flow<List<StockEntryEntity>> = stockEntryDao.getAll()

    fun getByProduct(productId: Int): Flow<List<StockEntryEntity>> = stockEntryDao.getByProduct(productId)

    suspend fun getByDateRange(start: Long, end: Long): List<StockEntryEntity> =
        stockEntryDao.getByDateRange(start, end)

    suspend fun insert(entry: StockEntryEntity): Long = stockEntryDao.insert(entry)

    suspend fun update(entry: StockEntryEntity) = stockEntryDao.update(entry)

    suspend fun delete(entry: StockEntryEntity) = stockEntryDao.delete(entry)

    suspend fun getTotalCostInRange(start: Long, end: Long): Double =
        stockEntryDao.getTotalCostInRange(start, end)
}
