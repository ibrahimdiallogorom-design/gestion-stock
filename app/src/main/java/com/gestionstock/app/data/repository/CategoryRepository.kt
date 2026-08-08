package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.CategoryDao
import com.gestionstock.app.data.local.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow

class CategoryRepository(private val categoryDao: CategoryDao) {

    fun getAll(): Flow<List<CategoryEntity>> = categoryDao.getAll()

    suspend fun insert(category: CategoryEntity): Long = categoryDao.insert(category)

    suspend fun update(category: CategoryEntity) = categoryDao.update(category)

    suspend fun delete(category: CategoryEntity) = categoryDao.delete(category)

    suspend fun getById(id: Int): CategoryEntity? = categoryDao.getById(id)
}
