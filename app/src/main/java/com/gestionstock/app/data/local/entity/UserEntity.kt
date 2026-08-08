package com.gestionstock.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val username: String,
    val password: String, // MD5 hash
    val role: String, // "ADMIN" or "CAISSIER"
    val fullName: String,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)
