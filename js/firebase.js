import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js"

// Firebase konfiguratsiyasi
const firebaseConfig = {
  apiKey: "AIzaSyCY0hxyhQu6AEE9SbaW6L3cheYbfV-5FcY",
  authDomain: "sutudent-16f99.firebaseapp.com",
  databaseURL: "https://sutudent-16f99-default-rtdb.firebaseio.com",
  projectId: "sutudent-16f99",
  storageBucket: "sutudent-16f99.firebasestorage.app",
  messagingSenderId: "297224570513",
  appId: "1:297224570513:web:a25fc5f6d21e6aa795a130",
  measurementId: "G-JF16K6V1CE",
}

// Firebase ni ishga tushirish
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const analytics = getAnalytics(app)

// Firebase bilan ishlash uchun yordamchi funksiyalar
class FirebaseManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.cache = new Map() // Vaqtinchalik cache

    // Internet aloqasini kuzatish
    window.addEventListener("online", () => {
      this.isOnline = true
      this.updateConnectionStatus()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.updateConnectionStatus()
    })

    // Dastlabki ma'lumotlarni yaratish
    this.initializeDefaultData()
  }

  // Dastlabki ma'lumotlarni yaratish
  async initializeDefaultData() {
    try {
      const usersSnapshot = await get(ref(database, "users"))
      if (!usersSnapshot.exists()) {
        const defaultUsers = {
          admin: {
            id: "admin",
            email: "oquvchi@gmail.com",
            password: "*admin123*",
            name: "Admin",
            role: "admin",
            telegram: "@admin",
            referralCode: "ADMIN2024",
            createdAt: new Date().toISOString(),
          },
        }
        await set(ref(database, "users"), defaultUsers)
      }

      // Boshqa default ma'lumotlarni yaratish
      const defaultCollections = [
        "tasks",
        "tests",
        "projects",
        "submissions",
        "testResults",
        "projectSubmissions",
        "withdrawalRequests",
        "paymentTransactions",
        "attendanceRecords",
        "chatMessages",
        "notifications",
        "userActivity",
        "referrals",
      ]

      for (const collection of defaultCollections) {
        const snapshot = await get(ref(database, collection))
        if (!snapshot.exists()) {
          await set(ref(database, collection), {})
        }
      }
    } catch (error) {
      console.error("Default ma'lumotlar yaratishda xatolik:", error)
    }
  }

  // Referal kod yaratish
  generateReferralCode(name) {
    const prefix = name.substring(0, 3).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return prefix + random
  }

  // Ma'lumotlarni Firebase ga saqlash
  async saveData(path, data) {
    try {
      if (!this.isOnline) {
        throw new Error("Internet aloqasi yo'q")
      }
      await set(ref(database, path), data)
      this.cache.set(path, data)
      return true
    } catch (error) {
      console.error("Firebase save error:", error)
      throw error
    }
  }

  // Ma'lumotlarni Firebase dan olish
  async getData(path) {
    try {
      if (!this.isOnline) {
        // Cache dan olishga harakat qilish
        if (this.cache.has(path)) {
          return this.cache.get(path)
        }
        throw new Error("Internet aloqasi yo'q va cache da ma'lumot yo'q")
      }

      const snapshot = await get(ref(database, path))
      if (snapshot.exists()) {
        const data = snapshot.val()
        this.cache.set(path, data)
        return data
      }
      return null
    } catch (error) {
      console.error("Firebase get error:", error)
      // Cache dan olishga harakat qilish
      if (this.cache.has(path)) {
        return this.cache.get(path)
      }
      throw error
    }
  }

  // Yangi ma'lumot qo'shish (auto ID bilan)
  async pushData(path, data) {
    try {
      if (!this.isOnline) {
        throw new Error("Internet aloqasi yo'q")
      }

      const newRef = push(ref(database, path))
      const dataWithId = { ...data, id: newRef.key }
      await set(newRef, dataWithId)

      // Cache ni yangilash
      const existingData = this.cache.get(path) || {}
      existingData[newRef.key] = dataWithId
      this.cache.set(path, existingData)

      return newRef.key
    } catch (error) {
      console.error("Firebase push error:", error)
      throw error
    }
  }

  // Ma'lumotni yangilash
  async updateData(path, updates) {
    try {
      if (!this.isOnline) {
        throw new Error("Internet aloqasi yo'q")
      }

      await update(ref(database, path), updates)

      // Cache ni yangilash
      const cachedData = this.cache.get(path) || {}
      Object.assign(cachedData, updates)
      this.cache.set(path, cachedData)

      return true
    } catch (error) {
      console.error("Firebase update error:", error)
      throw error
    }
  }

  // Ma'lumotni o'chirish
  async deleteData(path) {
    try {
      if (!this.isOnline) {
        throw new Error("Internet aloqasi yo'q")
      }

      await remove(ref(database, path))
      this.cache.delete(path)
      return true
    } catch (error) {
      console.error("Firebase delete error:", error)
      throw error
    }
  }

  // Real-time ma'lumotlarni kuzatish
  listenToData(path, callback) {
    if (!this.isOnline) {
      console.warn("Offline rejimda real-time kuzatish ishlamaydi")
      return
    }

    const dataRef = ref(database, path)
    return onValue(
      dataRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          this.cache.set(path, data)
          callback(data)
        } else {
          callback(null)
        }
      },
      (error) => {
        console.error("Real-time listening error:", error)
      },
    )
  }

  // Array ma'lumotlarni olish
  async getArrayData(path) {
    try {
      const data = await this.getData(path)
      if (!data) return []

      // Object ni array ga aylantirish
      return Object.values(data)
    } catch (error) {
      console.error("Array ma'lumot olishda xatolik:", error)
      return []
    }
  }

  // Array ma'lumotga element qo'shish
  async addToArray(path, item) {
    try {
      return await this.pushData(path, item)
    } catch (error) {
      console.error("Array ga qo'shishda xatolik:", error)
      throw error
    }
  }

  // Array dan element o'chirish
  async removeFromArray(path, itemId) {
    try {
      return await this.deleteData(`${path}/${itemId}`)
    } catch (error) {
      console.error("Array dan o'chirishda xatolik:", error)
      throw error
    }
  }

  // Array dagi elementni yangilash
  async updateInArray(path, itemId, updates) {
    try {
      return await this.updateData(`${path}/${itemId}`, updates)
    } catch (error) {
      console.error("Array da yangilashda xatolik:", error)
      throw error
    }
  }

  // Foydalanuvchi autentifikatsiyasi
  async authenticateUser(email, password) {
    try {
      const users = await this.getArrayData("users")
      const user = users.find((u) => u.email === email && u.password === password)

      if (user) {
        // Foydalanuvchi faoliyatini yozish
        await this.logUserActivity(user.id, "login", "Tizimga kirdi")
        return user
      }
      return null
    } catch (error) {
      console.error("Autentifikatsiya xatoligi:", error)
      throw error
    }
  }

  // Foydalanuvchi ro'yxatdan o'tkazish
  async registerUser(userData) {
    try {
      const users = await this.getArrayData("users")

      // Email tekshirish
      if (users.find((u) => u.email === userData.email)) {
        throw new Error("Bu email allaqachon ro'yxatdan o'tgan!")
      }

      const userId = Date.now().toString()
      const referralCode = this.generateReferralCode(userData.name)

      const newUser = {
        ...userData,
        id: userId,
        role: "student",
        rating: 0,
        balance: 0,
        referralCode: referralCode,
        joinDate: new Date().toISOString(),
      }

      await this.addToArray("users", newUser)

      // Referal kodini tekshirish va so'rov yaratish
      if (userData.referralCode && userData.referralCode.trim()) {
        const referrer = users.find((u) => u.referralCode === userData.referralCode.trim().toUpperCase())
        if (referrer && referrer.role === "student") {
          const referralRequest = {
            referrerId: referrer.id,
            referrerName: referrer.name,
            newUserId: userId,
            newUserName: userData.name,
            newUserEmail: userData.email,
            referralCode: userData.referralCode.trim().toUpperCase(),
            status: "pending",
            requestedAt: new Date().toISOString(),
          }

          await this.addToArray("referrals", referralRequest)
        }
      }

      // Foydalanuvchi faoliyatini yozish
      await this.logUserActivity(newUser.id, "register", "Ro'yxatdan o'tdi")

      return newUser
    } catch (error) {
      console.error("Ro'yxatdan o'tishda xatolik:", error)
      throw error
    }
  }

  // Referal so'rovini tasdiqlash
  async approveReferral(referralId) {
    try {
      const referrals = await this.getArrayData("referrals")
      const referral = referrals.find((r) => r.id === referralId)

      if (!referral || referral.status !== "pending") {
        throw new Error("Referral topilmadi yoki allaqachon qaralgan")
      }

      // Referal holatini yangilash
      await this.updateInArray("referrals", referralId, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      })

      // Refererga coin berish
      const users = await this.getArrayData("users")
      const referrer = users.find((u) => u.id === referral.referrerId)

      if (referrer) {
        await this.updateInArray("users", referrer.id, {
          rating: (referrer.rating || 0) + 20000,
        })

        // Transaction yozish
        await this.addToArray("paymentTransactions", {
          studentId: referrer.id,
          type: "earning",
          amount: 20000,
          description: `Referal bonus: ${referral.newUserName} ni taklif qilish`,
          timestamp: new Date().toISOString(),
          relatedId: referralId,
        })

        // Notification yuborish
        await this.sendNotification([referrer.id], {
          type: "payment",
          title: "Referal bonusi!",
          message: `${referral.newUserName} ni taklif qilganingiz uchun 20,000 coin oldingiz!`,
        })
      }

      return true
    } catch (error) {
      console.error("Referalni tasdiqlashda xatolik:", error)
      throw error
    }
  }

  // Referal so'rovini rad etish
  async rejectReferral(referralId, reason = "") {
    try {
      await this.updateInArray("referrals", referralId, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      })
      return true
    } catch (error) {
      console.error("Referalni rad etishda xatolik:", error)
      throw error
    }
  }

  // Foydalanuvchi faoliyatini yozish
  async logUserActivity(userId, action, description) {
    try {
      const activity = {
        userId,
        action,
        description,
        timestamp: new Date().toISOString(),
      }
      await this.addToArray("userActivity", activity)
    } catch (error) {
      console.error("Faoliyat yozishda xatolik:", error)
    }
  }

  // Bildirishnoma yuborish
  async sendNotification(userIds, notification) {
    try {
      const notifications = []
      userIds.forEach((userId) => {
        notifications.push({
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: new Date().toISOString(),
          read: false,
        })
      })

      for (const notif of notifications) {
        await this.addToArray("notifications", notif)
      }
    } catch (error) {
      console.error("Bildirishnoma yuborishda xatolik:", error)
    }
  }

  // Ulanish holatini yangilash
  updateConnectionStatus() {
    const indicator = document.getElementById("connectionIndicator")
    const text = document.getElementById("connectionText")
    const dataSource = document.getElementById("dataSource")

    if (indicator && text) {
      if (this.isOnline) {
        indicator.className = "w-3 h-3 rounded-full bg-green-400"
        text.textContent = "Online"
        if (dataSource) dataSource.textContent = "Ma'lumotlar: Firebase"
      } else {
        indicator.className = "w-3 h-3 rounded-full bg-red-400"
        text.textContent = "Offline"
        if (dataSource) dataSource.textContent = "Ma'lumotlar: Cache"
      }
    }
  }

  // Firebase holatini tekshirish
  getConnectionStatus() {
    return this.isOnline
  }

  // Ma'lumotlar bazasini eksport qilish
  async exportDatabase() {
    try {
      const collections = [
        "users",
        "tasks",
        "tests",
        "projects",
        "submissions",
        "testResults",
        "projectSubmissions",
        "withdrawalRequests",
        "paymentTransactions",
        "attendanceRecords",
        "chatMessages",
        "notifications",
        "userActivity",
        "referrals",
      ]

      const exportData = {}
      for (const collection of collections) {
        exportData[collection] = await this.getArrayData(collection)
      }

      return exportData
    } catch (error) {
      console.error("Eksport xatoligi:", error)
      throw error
    }
  }
}

// Global Firebase manager
const firebaseManager = new FirebaseManager()

// Connection status ni dastlabki yangilash
setTimeout(() => {
  firebaseManager.updateConnectionStatus()
}, 1000)

// Export qilish
export { firebaseManager, database, app }
