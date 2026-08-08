package com.gestionstock.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sales")
data class SaleEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: Int,
    val totalAmount: Double,
    val discountAmount: Double = 0.0,
    val taxRate: Double = 0.0,
    val paymentMethod: String = "CASH", // CASH, CARD, TRANSFER
    val notes: String = "",
    val status: String = "COMPLETED", // COMPLETED, CANCELLED
    val createdAt: Long = System.currentTimeMillis()
)
