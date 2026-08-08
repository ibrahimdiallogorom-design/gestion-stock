package com.example.gestionstock.data.repository

import com.example.gestionstock.data.local.dao.UserDao
import com.example.gestionstock.data.local.database.AppDatabase
import com.example.gestionstock.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

class UserRepository(private val userDao: UserDao) {
    fun getAllUsers(): Flow<List<UserEntity>> = userDao.getAllUsers()

    suspend fun login(username: String, password: String): UserEntity? {
        val hashedPw = AppDatabase.md5(password)
        return userDao.login(username, hashedPw)
    }

    suspend fun insert(user: UserEntity, rawPassword: String): Long {
        val hashed = user.copy(password = AppDatabase.md5(rawPassword))
        return userDao.insert(hashed)
    }

    suspend fun update(user: UserEntity): Unit = userDao.update(user)

    suspend fun deactivate(id: Int): Unit = userDao.deactivate(id)

    suspend fun getById(id: Int): UserEntity? = userDao.getById(id)
}
