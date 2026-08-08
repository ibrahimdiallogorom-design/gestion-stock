package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.DailySaleResult
import com.example.gestionstock.data.local.dao.SaleDao
import com.example.gestionstock.data.local.dao.SaleItemDao
import com.example.gestionstock.data.local.dao.TopProductResult
import com.example.gestionstock.data.local.entity.SaleEntity
import com.example.gestionstock.data.local.entity.SaleItemEntity
import kotlinx.coroutines.flow.Flow

class SaleRepository(
    private val saleDao: SaleDao,
    private val saleItemDao: SaleItemDao
) {
    fun getAllSales(): Flow<List<SaleEntity>> = saleDao.getAll()

    fun getSalesByDateRange(startDate: Long, endDate: Long): Flow<List<SaleEntity>> =
        saleDao.getSalesByDateRange(startDate, endDate)

    suspend fun getSalesByMonth(yearMonth: String): List<SaleEntity> =
        saleDao.getSalesByMonth(yearMonth)

    suspend fun getTotalSalesToday(startOfDay: Long): Double =
        saleDao.getTotalSalesToday(startOfDay)

    suspend fun getTotalSalesInRange(start: Long, end: Long): Double =
        saleDao.getTotalSalesInRange(start, end)

    suspend fun getCountToday(startOfDay: Long): Int =
        saleDao.getCountToday(startOfDay)

    suspend fun getCountInRange(start: Long, end: Long): Int =
        saleDao.getCountInRange(start, end)

    suspend fun insertSale(sale: SaleEntity): Long = saleDao.insert(sale)

    suspend fun updateSale(sale: SaleEntity) = saleDao.update(sale)

    suspend fun getSaleById(id: Int): SaleEntity? = saleDao.getById(id)

    suspend fun getDailySalesInRange(start: Long, end: Long): List<DailySaleResult> =
        saleDao.getDailySalesInRange(start, end)

    // Items
    suspend fun getItemsBySaleId(saleId: Int): List<SaleItemEntity> =
        saleItemDao.getBySaleId(saleId)

    fun getItemsBySaleIdFlow(saleId: Int): Flow<List<SaleItemEntity>> =
        saleItemDao.getBySaleIdFlow(saleId)

    suspend fun insertSaleItems(items: List<SaleItemEntity>) =
        saleItemDao.insertAll(items)

    suspend fun getTopProducts(start: Long, end: Long, limit: Int): List<TopProductResult> =
        saleItemDao.getTopProducts(start, end, limit)
}
