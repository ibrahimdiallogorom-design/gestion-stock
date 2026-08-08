package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.SupplierDao
import com.gestionstock.app.data.local.entity.SupplierEntity
import kotlinx.coroutines.flow.Flow

class SupplierRepository(private val supplierDao: SupplierDao) {

    fun getAll(): Flow<List<SupplierEntity>> = supplierDao.getAll()

    suspend fun insert(supplier: SupplierEntity): Long = supplierDao.insert(supplier)

    suspend fun update(supplier: SupplierEntity) = supplierDao.update(supplier)

    suspend fun delete(supplier: SupplierEntity) = supplierDao.delete(supplier)

    suspend fun getById(id: Int): SupplierEntity? = supplierDao.getById(id)
}
