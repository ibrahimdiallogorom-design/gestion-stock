package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.SupplierDao
import com.example.gestionstock.data.local.entity.SupplierEntity
import kotlinx.coroutines.flow.Flow

class SupplierRepository(private val dao: SupplierDao) {
    fun getAll(): Flow<List<SupplierEntity>> = dao.getAll()
    suspend fun getById(id: Int): SupplierEntity? = dao.getById(id)
    suspend fun insert(supplier: SupplierEntity): Long = dao.insert(supplier)
    suspend fun update(supplier: SupplierEntity) = dao.update(supplier)
    suspend fun delete(supplier: SupplierEntity) = dao.delete(supplier)
}
