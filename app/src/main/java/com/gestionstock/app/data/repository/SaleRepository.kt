package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.SaleDao
import com.gestionstock.app.data.local.dao.SaleItemDao
import com.gestionstock.app.data.local.dao.TopProductResult
import com.gestionstock.app.data.local.entity.SaleEntity
import com.gestionstock.app.data.local.entity.SaleItemEntity
import kotlinx.coroutines.flow.Flow

class SaleRepository(
    private val saleDao: SaleDao,
    private val saleItemDao: SaleItemDao
) {
    fun getAll(): Flow<List<SaleEntity>> = saleDao.getAll()

    fun getSalesByDateRange(start: Long, end: Long): Flow<List<SaleEntity>> =
        saleDao.getSalesByDateRange(start, end)

    fun getSalesByMonth(yearMonth: String): Flow<List<SaleEntity>> =
        saleDao.getSalesByMonth(yearMonth)

    suspend fun getTotalSalesToday(startOfDay: Long): Double =
        saleDao.getTotalSalesToday(startOfDay)

    suspend fun getTotalSalesInRange(start: Long, end: Long): Double =
        saleDao.getTotalSalesInRange(start, end)

    suspend fun getCountToday(startOfDay: Long): Int =
        saleDao.getCountToday(startOfDay)

    suspend fun getCompletedSalesInRange(start: Long, end: Long): List<SaleEntity> =
        saleDao.getCompletedSalesInRange(start, end)

    suspend fun insertSaleWithItems(sale: SaleEntity, items: List<SaleItemEntity>): Long {
        val saleId = saleDao.insert(sale)
        val itemsWithSaleId = items.map { it.copy(saleId = saleId.toInt()) }
        saleItemDao.insertAll(itemsWithSaleId)
        return saleId
    }

    suspend fun getById(id: Int): SaleEntity? = saleDao.getById(id)

    suspend fun update(sale: SaleEntity) = saleDao.update(sale)

    suspend fun getSaleItems(saleId: Int): List<SaleItemEntity> = saleItemDao.getBySaleId(saleId)

    fun getSaleItemsFlow(saleId: Int): Flow<List<SaleItemEntity>> = saleItemDao.getBySaleIdFlow(saleId)

    suspend fun getTopProducts(start: Long, end: Long, limit: Int = 10): List<TopProductResult> =
        saleItemDao.getTopProducts(start, end, limit)
}
