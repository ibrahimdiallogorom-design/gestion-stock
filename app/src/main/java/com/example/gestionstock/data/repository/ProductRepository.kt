package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.ProductDao
import com.example.gestionstock.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

class ProductRepository(private val dao: ProductDao) {
    fun getAll(): Flow<List<ProductEntity>> = dao.getAll()
    fun getByCategory(categoryId: Int): Flow<List<ProductEntity>> = dao.getByCategory(categoryId)
    fun getLowStockProducts(): Flow<List<ProductEntity>> = dao.getLowStockProducts()
    fun search(query: String): Flow<List<ProductEntity>> = dao.search(query)
    suspend fun getById(id: Int): ProductEntity? = dao.getById(id)
    suspend fun insert(product: ProductEntity): Long = dao.insert(product)
    suspend fun update(product: ProductEntity) = dao.update(product)
    suspend fun delete(product: ProductEntity) = dao.delete(product)
    suspend fun addStock(id: Int, quantity: Int) = dao.addStock(id, quantity)
    suspend fun removeStock(id: Int, quantity: Int) = dao.removeStock(id, quantity)
    suspend fun getCount(): Int = dao.getCount()
    suspend fun getTotalStockValue(): Double = dao.getTotalStockValue()
    suspend fun getLowStockCount(): Int = dao.getLowStockCount()
}
