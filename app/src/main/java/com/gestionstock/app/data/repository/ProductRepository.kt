package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.ProductDao
import com.gestionstock.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

class ProductRepository(private val productDao: ProductDao) {

    fun getAll(): Flow<List<ProductEntity>> = productDao.getAll()

    fun getByCategory(categoryId: Int): Flow<List<ProductEntity>> = productDao.getByCategory(categoryId)

    fun getLowStockProducts(): Flow<List<ProductEntity>> = productDao.getLowStockProducts()

    fun search(query: String): Flow<List<ProductEntity>> = productDao.search(query)

    suspend fun getById(id: Int): ProductEntity? = productDao.getById(id)

    suspend fun insert(product: ProductEntity): Long = productDao.insert(product)

    suspend fun update(product: ProductEntity) = productDao.update(product.copy(updatedAt = System.currentTimeMillis()))

    suspend fun delete(product: ProductEntity) = productDao.delete(product)

    suspend fun addStock(id: Int, quantity: Int) = productDao.addStock(id, quantity)

    suspend fun removeStock(id: Int, quantity: Int) = productDao.removeStock(id, quantity)

    suspend fun getCount(): Int = productDao.getCount()

    suspend fun getTotalStockValue(): Double = productDao.getTotalStockValue() ?: 0.0

    suspend fun getLowStockCount(): Int = productDao.getLowStockCount()
}
