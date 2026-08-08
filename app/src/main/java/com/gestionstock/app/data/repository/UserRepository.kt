package com.gestionstock.app.data.repository

import com.gestionstock.app.data.local.dao.UserDao
import com.gestionstock.app.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow
import java.security.MessageDigest

class UserRepository(private val userDao: UserDao) {

    fun getAllUsers(): Flow<List<UserEntity>> = userDao.getAllUsers()

    suspend fun login(username: String, password: String): UserEntity? {
        val hashedPassword = md5(password)
        return userDao.login(username, hashedPassword)
    }

    suspend fun insert(user: UserEntity): Long = userDao.insert(user.copy(password = md5(user.password)))

    suspend fun update(user: UserEntity) = userDao.update(user)

    suspend fun deactivate(id: Int) = userDao.deactivate(id)

    suspend fun activate(id: Int) = userDao.activate(id)

    suspend fun getUserCount(): Int = userDao.getUserCount()

    suspend fun getById(id: Int): UserEntity? = userDao.getById(id)

    suspend fun changePassword(id: Int, newPassword: String) {
        val user = userDao.getById(id) ?: return
        userDao.update(user.copy(password = md5(newPassword)))
    }

    private fun md5(input: String): String {
        val md = MessageDigest.getInstance("MD5")
        val bytes = md.digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
