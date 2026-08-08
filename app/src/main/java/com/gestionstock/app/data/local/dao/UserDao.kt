package com.gestionstock.app.data.local.dao

import androidx.room.*
import com.gestionstock.app.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE username = :username AND password = :password AND isActive = 1")
    suspend fun login(username: String, password: String): UserEntity?

    @Query("SELECT * FROM users ORDER BY fullName ASC")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: UserEntity): Long

    @Update
    suspend fun update(user: UserEntity)

    @Query("UPDATE users SET isActive = 0 WHERE id = :id")
    suspend fun deactivate(id: Int)

    @Query("UPDATE users SET isActive = 1 WHERE id = :id")
    suspend fun activate(id: Int)

    @Query("SELECT COUNT(*) FROM users")
    suspend fun getUserCount(): Int

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getById(id: Int): UserEntity?
}
