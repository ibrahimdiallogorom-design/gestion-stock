package com.example.gestionstock.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sales",
    foreignKeys = [ForeignKey(
        entity = UserEntity::class,
        parentColumns = ["id"],
        childColumns = ["userId"],
        onDelete = ForeignKey.RESTRICT
    )],
    indices = [Index("userId")]
)
data class SaleEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId: Int,
    val totalAmount: Double,
    val discountAmount: Double = 0.0,
    val taxRate: Double = 0.0,
    val paymentMethod: String = "CASH",
    val notes: String = "",
    val status: String = "COMPLETED",
    val createdAt: Long = System.currentTimeMillis()
)
