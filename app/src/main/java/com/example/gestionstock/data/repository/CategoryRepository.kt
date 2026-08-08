package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.CategoryDao
import com.example.gestionstock.data.local.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow

class CategoryRepository(private val dao: CategoryDao) {
    fun getAll(): Flow<List<CategoryEntity>> = dao.getAll()
    suspend fun getById(id: Int): CategoryEntity? = dao.getById(id)
    suspend fun insert(category: CategoryEntity): Long = dao.insert(category)
    suspend fun update(category: CategoryEntity) = dao.update(category)
    suspend fun delete(category: CategoryEntity) = dao.delete(category)
}
