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
        "monthlyPayments",
        "paymentRequests",
        "groups",
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
        paymentStatus: "unpaid",
        lastPaymentDate: null,
        canWithdraw: false,
        groupId: null,
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

  // Oylik to'lov yaratish
  async createMonthlyPayment(studentIds, amount, description, dueDate) {
    try {
      const paymentIds = []
      
      // Har bir o'quvchi uchun alohida to'lov yaratish
      for (const studentId of studentIds) {
        const payment = {
          studentId,
          amount,
          description,
          dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
          canPayWithCoins: true
        }

        const paymentId = await this.addToArray("monthlyPayments", payment)
        paymentIds.push(paymentId)

        // O'quvchining to'lov holatini yangilash
        await this.updateInArray("users", studentId, {
          paymentStatus: "unpaid",
          currentPaymentId: paymentId,
          paymentAmount: amount,
          paymentDescription: description,
          paymentDueDate: payment.dueDate,
          canWithdraw: false,
        })
      }

      // Bildirishnoma yuborish
      await this.sendNotification(studentIds, {
        type: "payment",
        title: "Yangi to'lov",
        message: `${description}: ${amount.toLocaleString()} so'm yoki ${Math.ceil(amount / 10).toLocaleString()} coin`,
      })

      return paymentIds
    } catch (error) {
      console.error("Oylik to'lov yaratishda xatolik:", error)
      throw error
    }
  }

  // Coin bilan to'lash
  async payWithCoins(studentId, paymentId, customAmount = null) {
    try {
      const users = await this.getArrayData("users")
      const payments = await this.getArrayData("monthlyPayments")
      
      const user = users.find(u => u.id === studentId)
      const payment = payments.find(p => p.id === paymentId)

      if (!user || !payment) {
        throw new Error("Foydalanuvchi yoki to'lov topilmadi")
      }

      if (payment.status === "paid") {
        throw new Error("Bu to'lov allaqachon to'langan")
      }

      // Use custom amount or full payment amount
      const paymentAmount = customAmount || (payment.amount - (payment.paidAmount || 0))
      const requiredCoins = Math.ceil(paymentAmount / 10) // 1 coin = 10 so'm
      
      if (user.rating < requiredCoins) {
        throw new Error(`Yetarli coin yo'q. Kerak: ${requiredCoins.toLocaleString()} coin, Mavjud: ${user.rating.toLocaleString()} coin`)
      }

      // Calculate remaining payment amount
      const totalPaid = (payment.paidAmount || 0) + paymentAmount
      const remainingAmount = payment.amount - totalPaid
      const isFullPayment = remainingAmount <= 0

      // Coinlarni yechish
      await this.updateInArray("users", studentId, {
        rating: user.rating - requiredCoins,
        paymentStatus: isFullPayment ? "paid" : "partial",
        lastPaymentDate: isFullPayment ? new Date().toISOString() : user.lastPaymentDate,
        currentPaymentId: isFullPayment ? null : paymentId,
        paymentAmount: isFullPayment ? null : remainingAmount,
        paymentDescription: isFullPayment ? null : payment.description,
        paymentDueDate: isFullPayment ? null : payment.dueDate,
        canWithdraw: isFullPayment,
      })

      // To'lov holatini yangilash
      await this.updateInArray("monthlyPayments", paymentId, {
        status: isFullPayment ? "paid" : "partial",
        paidAt: new Date().toISOString(),
        paymentMethod: "coins",
        coinsUsed: requiredCoins,
        paidAmount: totalPaid,
        remainingAmount: remainingAmount
      })

      // Transaction yozish
      await this.addToArray("paymentTransactions", {
        studentId,
        type: "payment",
        amount: -requiredCoins,
        description: `Coin bilan to'lov: ${payment.description} (${paymentAmount.toLocaleString()} so'm)`,
        timestamp: new Date().toISOString(),
        relatedId: paymentId,
      })

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "payment",
        title: isFullPayment ? "To'lov to'liq amalga oshirildi" : "Qisman to'lov amalga oshirildi",
        message: `${paymentAmount.toLocaleString()} so'm (${requiredCoins.toLocaleString()} coin) to'landi${!isFullPayment ? `. Qolgan: ${remainingAmount.toLocaleString()} so'm` : ''}`,
      })

      return true
    } catch (error) {
      console.error("Coin bilan to'lashda xatolik:", error)
      throw error
    }
  }

  // To'lovni tasdiqlash (admin tomonidan)
  async confirmPayment(paymentId, studentId) {
    try {
      // To'lov holatini yangilash
      await this.updateInArray("monthlyPayments", paymentId, {
        status: "paid",
        paidAt: new Date().toISOString(),
        paymentMethod: "cash",
      })

      // O'quvchining to'lov holatini yangilash
      await this.updateInArray("users", studentId, {
        paymentStatus: "paid",
        lastPaymentDate: new Date().toISOString(),
        currentPaymentId: null,
        paymentAmount: null,
        paymentDescription: null,
        paymentDueDate: null,
        canWithdraw: true,
      })

      // Transaction yozish
      const payments = await this.getArrayData("monthlyPayments")
      const payment = payments.find(p => p.id === paymentId)
      
      await this.addToArray("paymentTransactions", {
        studentId,
        type: "payment",
        amount: payment.amount,
        description: `To'lov tasdiqlandi: ${payment.description}`,
        timestamp: new Date().toISOString(),
        relatedId: paymentId,
      })

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "payment",
        title: "To'lov tasdiqlandi",
        message: "Sizning to'lovingiz admin tomonidan tasdiqlandi",
      })

      return true
    } catch (error) {
      console.error("To'lovni tasdiqlashda xatolik:", error)
      throw error
    }
  }

  // To'lov jarima qo'llash
  async applyPaymentPenalty(studentId, amount = 2000) {
    try {
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === studentId)
      
      if (user) {
        // Jarima qo'llash
        await this.updateInArray("users", studentId, {
          rating: (user.rating || 0) - amount,
          canWithdraw: false,
        })

        // Transaction yozish
        await this.addToArray("paymentTransactions", {
          studentId,
          type: "fine",
          amount: -amount,
          description: "To'lov jarima - oylik to'lov kechiktirildi",
          timestamp: new Date().toISOString(),
        })

        // Bildirishnoma yuborish
        await this.sendNotification([studentId], {
          type: "payment",
          title: "To'lov jarima",
          message: `Oylik to'lovni kechiktirganingiz uchun ${amount.toLocaleString()} coin jarima qo'llandi`,
        })

        return true
      }
    } catch (error) {
      console.error("To'lov jarima qo'llashda xatolik:", error)
      throw error
    }
  }

  // Pul yechish so'rovi
  async requestWithdrawal(studentId, coins, cardNumber, method, password) {
    try {
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === studentId)

      if (!user) {
        throw new Error("Foydalanuvchi topilmadi")
      }

      if (!user.canWithdraw) {
        throw new Error("Oylik to'lovni to'lamaguningizcha pul yecha olmaysiz")
      }

      if (coins < 1000) {
        throw new Error("Minimal yechish miqdori 1,000 coin")
      }

      if (user.rating < coins) {
        throw new Error("Yetarli coin yo'q")
      }

      if (user.password !== password) {
        throw new Error("Parol noto'g'ri")
      }

      const amount = Math.floor(coins * 10) // 100 coin = 1000 so'm

      const withdrawal = {
        studentId,
        studentName: user.name,
        coins,
        amount,
        cardNumber,
        method,
        status: "pending",
        requestedAt: new Date().toISOString(),
      }

      await this.addToArray("withdrawalRequests", withdrawal)

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "withdrawal",
        title: "Pul yechish so'rovi",
        message: `${coins.toLocaleString()} coin (${amount.toLocaleString()} so'm) yechish so'rovi yuborildi`,
      })

      return true
    } catch (error) {
      console.error("Pul yechish so'rovida xatolik:", error)
      throw error
    }
  }

  // Pul yechish so'rovini tasdiqlash
  async approveWithdrawal(requestId) {
    try {
      const requests = await this.getArrayData("withdrawalRequests")
      const request = requests.find(r => r.id === requestId)

      if (!request) {
        throw new Error("So'rov topilmadi")
      }

      // Foydalanuvchidan coinlarni yechish
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === request.studentId)

      if (user && user.rating >= request.coins) {
        await this.updateInArray("users", request.studentId, {
          rating: user.rating - request.coins,
        })

        // Transaction yozish
        await this.addToArray("paymentTransactions", {
          studentId: request.studentId,
          type: "withdrawal",
          amount: -request.coins,
          description: `Pul yechish: ${request.amount.toLocaleString()} so'm`,
          timestamp: new Date().toISOString(),
          relatedId: requestId,
        })
      }

      // So'rov holatini yangilash
      await this.updateInArray("withdrawalRequests", requestId, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      })

      // Bildirishnoma yuborish
      await this.sendNotification([request.studentId], {
        type: "withdrawal",
        title: "Pul yechish tasdiqlandi",
        message: `${request.amount.toLocaleString()} so'm kartangizga o'tkazildi`,
      })

      return true
    } catch (error) {
      console.error("Pul yechish so'rovini tasdiqlashda xatolik:", error)
      throw error
    }
  }

  // Vazifa yaratish
  async createTask(title, description, deadline, reward = 50, groupId = null, websiteUrl = null, assignedStudents = null) {
    try {
      const task = {
        title,
        description,
        deadline,
        reward,
        groupId,
        websiteUrl,
        assignedStudents: assignedStudents,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      }

      const taskId = await this.addToArray("tasks", task)

      // Bildirishnoma yuborish
      const users = await this.getArrayData("users")
      let students = users.filter(u => u.role === "student")
      
      if (assignedStudents && assignedStudents.length > 0) {
        students = students.filter(u => assignedStudents.includes(u.id))
      } else if (groupId) {
        students = students.filter(u => u.groupId === groupId)
      }
      
      const studentIdsList = students.map(s => s.id)

      if (studentIdsList.length > 0) {
        await this.sendNotification(studentIdsList, {
          type: "task",
          title: "Yangi vazifa",
          message: `${title} - ${reward} coin`,
        })
      }

      return taskId
    } catch (error) {
      console.error("Vazifa yaratishda xatolik:", error)
      throw error
    }
  }

  // Vazifa topshirish
  async submitTask(taskId, studentId, description) {
    try {
      const submissionData = {
        taskId,
        studentId,
        description,
        status: "pending",
        submittedAt: new Date().toISOString(),
      }

      const submissionId = await this.addToArray("submissions", submissionData)

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "task",
        title: "Vazifa topshirildi",
        message: "Vazifangiz admin tomonidan ko'rib chiqiladi",
      })

      return submissionId
    } catch (error) {
      console.error("Vazifa topshirishda xatolik:", error)
      throw error
    }
  }

  // Vazifa topshiriqini baholash
  async gradeSubmission(submissionId, customReward, feedback = "") {
    try {
      const submissions = await this.getArrayData("submissions")
      const submission = submissions.find(s => s.id === submissionId)

      if (!submission) {
        throw new Error("Topshiriq topilmadi")
      }

      const tasks = await firebaseManager.getArrayData("tasks")
      const task = tasks.find(t => t.id === submission.taskId)

      const finalReward = customReward !== undefined ? customReward : task.reward
      const isApproved = finalReward > 0
      // Topshiriq holatini yangilash
      await this.updateInArray("submissions", submissionId, {
        status: isApproved ? "approved" : "rejected",
        reward: finalReward,
        feedback,
        gradedAt: new Date().toISOString(),
      })

      // Agar muvaffaqiyatli bo'lsa, coin berish
      if (isApproved && finalReward > 0) {
        const users = await this.getArrayData("users")
        const user = users.find(u => u.id === submission.studentId)

        if (user) {
          await this.updateInArray("users", submission.studentId, {
            rating: (user.rating || 0) + finalReward,
          })

          // Transaction yozish
          await this.addToArray("paymentTransactions", {
            studentId: submission.studentId,
            type: "earning",
            amount: finalReward,
            description: `Vazifa bajarildi: ${task.title}`,
            timestamp: new Date().toISOString(),
            relatedId: submissionId,
          })
        }
      }

      // Bildirishnoma yuborish
      await this.sendNotification([submission.studentId], {
        type: "task",
        title: isApproved ? "Vazifa qabul qilindi" : "Vazifa rad etildi",
        message: isApproved ? 
          `${finalReward} coin olindingiz!` : 
          `Rad etildi. ${feedback}`,
      })

      return true
    } catch (error) {
      console.error("Vazifa baholashda xatolik:", error)
      throw error
    }
  }

  // Vazifa jarima qo'llash (muddati o'tgan vazifalar uchun)
  async applyTaskPenalty(studentId, amount = 200) {
    try {
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === studentId)
      
      if (user) {
        // Jarima qo'llash
        await this.updateInArray("users", studentId, {
          rating: (user.rating || 0) - amount,
        })

        // Transaction yozish
        await this.addToArray("paymentTransactions", {
          studentId,
          type: "fine",
          amount: -amount,
          description: "Vazifa jarima - muddati o'tgan vazifa",
          timestamp: new Date().toISOString(),
        })

        // Bildirishnoma yuborish
        await this.sendNotification([studentId], {
          type: "task",
          title: "Vazifa jarima",
          message: `Vazifani vaqtida bajarmaganingiz uchun ${amount} coin jarima qo'llandi`,
        })

        return true
      }
    } catch (error) {
      console.error("Vazifa jarima qo'llashda xatolik:", error)
      throw error
    }
  }

  // Test yaratish
  async createTest(title, description, questions, timeLimit = 30, groupId = null, assignedStudents = null) {
    try {
      const test = {
        title,
        description,
        questions,
        timeLimit,
        groupId,
        assignedStudents,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      }

      const testId = await this.addToArray("tests", test)

      // Bildirishnoma yuborish
      const users = await this.getArrayData("users")
      let students = users.filter(u => u.role === "student")
      
      if (assignedStudents && assignedStudents.length > 0) {
        students = students.filter(u => assignedStudents.includes(u.id))
      } else if (groupId) {
        students = students.filter(u => u.groupId === groupId)
      }
      
      const studentIds = students.map(s => s.id)

      if (studentIds.length > 0) {
        await this.sendNotification(studentIds, {
          type: "test",
          title: "Yangi test",
          message: `${title} - ${questions.length} savol`,
        })
      }

      return testId
    } catch (error) {
      console.error("Test yaratishda xatolik:", error)
      throw error
    }
  }

  // Test topshirish
  async submitTest(testId, studentId, answers) {
    try {
      const tests = await this.getArrayData("tests")
      const test = tests.find(t => t.id === testId)

      if (!test) {
        throw new Error("Test topilmadi")
      }

      // Javoblarni tekshirish
      let correctAnswers = 0
      const results = []

      test.questions.forEach((question, index) => {
        const userAnswer = answers[index]
        const isCorrect = userAnswer === question.correctAnswer
        
        if (isCorrect) {
          correctAnswers++
        }

        results.push({
          questionIndex: index,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
        })
      })

      const score = Math.round((correctAnswers / test.questions.length) * 100)
      const reward = score >= 70 ? Math.floor(score / 10) * 10 : 0

      const testResult = {
        testId,
        studentId,
        answers,
        results,
        score,
        reward,
        submittedAt: new Date().toISOString(),
      }

      const resultId = await this.addToArray("testResults", testResult)

      // Agar muvaffaqiyatli bo'lsa, coin berish
      if (reward > 0) {
        const users = await this.getArrayData("users")
        const user = users.find(u => u.id === studentId)

        if (user) {
          await this.updateInArray("users", studentId, {
            rating: (user.rating || 0) + reward,
          })

          // Transaction yozish
          await this.addToArray("paymentTransactions", {
            studentId,
            type: "earning",
            amount: reward,
            description: `Test bajarildi: ${test.title} (${score}%)`,
            timestamp: new Date().toISOString(),
            relatedId: resultId,
          })
        }
      }

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "test",
        title: "Test yakunlandi",
        message: `Natija: ${score}%${reward > 0 ? `, ${reward} coin olindingiz!` : ""}`,
      })

      return { resultId, score, reward }
    } catch (error) {
      console.error("Test topshirishda xatolik:", error)
      throw error
    }
  }

  // Loyiha yaratish
  async createProject(title, description, deadline, payment, groupId = null, assignedStudents = null, websiteUrl = null) {
    try {
      const project = {
        title,
        description,
        deadline,
        payment,
        groupId,
        assignedStudents,
        websiteUrl,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      }

      const projectId = await this.addToArray("projects", project)

      // Bildirishnoma yuborish
      const users = await this.getArrayData("users")
      let students = users.filter(u => u.role === "student")
      
      if (assignedStudents && assignedStudents.length > 0) {
        students = students.filter(u => assignedStudents.includes(u.id))
      } else if (groupId) {
        students = students.filter(u => u.groupId === groupId)
      }
      
      const studentIds = students.map(s => s.id)

      if (studentIds.length > 0) {
        await this.sendNotification(studentIds, {
          type: "project",
          title: "Yangi loyiha",
          message: `${title} - ${payment} coin`,
        })
      }

      return projectId
    } catch (error) {
      console.error("Loyiha yaratishda xatolik:", error)
      throw error
    }
  }

  // Loyiha topshirish
  async submitProject(projectId, studentId, description) {
    try {
      const submission = {
        projectId,
        studentId,
        description,
        status: "pending",
        submittedAt: new Date().toISOString(),
      }

      const submissionId = await this.addToArray("projectSubmissions", submission)

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "project",
        title: "Loyiha topshirildi",
        message: "Loyihangiz admin tomonidan ko'rib chiqiladi",
      })

      return submissionId
    } catch (error) {
      console.error("Loyiha topshirishda xatolik:", error)
      throw error
    }
  }

  // Loyiha topshiriqini baholash
  async gradeProjectSubmission(submissionId, customReward, feedback = "") {
    try {
      const submissions = await this.getArrayData("projectSubmissions")
      const submission = submissions.find(s => s.id === submissionId)

      if (!submission) {
        throw new Error("Loyiha topshirig'i topilmadi")
      }

      const projects = await this.getArrayData("projects")
      const project = projects.find(p => p.id === submission.projectId)

      const finalReward = customReward !== undefined ? customReward : project.payment
      const isApproved = finalReward > 0

      // Topshiriq holatini yangilash
      await this.updateInArray("projectSubmissions", submissionId, {
        status: isApproved ? "approved" : "rejected",
        reward: finalReward,
        feedback,
        gradedAt: new Date().toISOString(),
      })

      // Agar muvaffaqiyatli bo'lsa, coin berish
      if (isApproved && finalReward > 0) {
        const users = await this.getArrayData("users")
        const user = users.find(u => u.id === submission.studentId)

        if (user) {
          await this.updateInArray("users", submission.studentId, {
            rating: (user.rating || 0) + finalReward,
          })

          // Transaction yozish
          await this.addToArray("paymentTransactions", {
            studentId: submission.studentId,
            type: "earning",
            amount: finalReward,
            description: `Loyiha bajarildi: ${project.title}`,
            timestamp: new Date().toISOString(),
            relatedId: submissionId,
          })
        }
      }

      // Bildirishnoma yuborish
      await this.sendNotification([submission.studentId], {
        type: "project",
        title: isApproved ? "Loyiha qabul qilindi" : "Loyiha rad etildi",
        message: isApproved ? 
          `${finalReward} coin olindingiz!` : 
          `Rad etildi. ${feedback}`,
      })

      return true
    } catch (error) {
      console.error("Loyiha baholashda xatolik:", error)
      throw error
    }
  }

  // Coin qo'shish/ayirish
  async adjustCoins(studentId, amount, reason, type = "adjustment") {
    try {
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === studentId)
      
      if (!user) {
        throw new Error("Foydalanuvchi topilmadi")
      }

      const newRating = (user.rating || 0) + amount
      
      await this.updateInArray("users", studentId, {
        rating: newRating,
      })

      // Transaction yozish
      await this.addToArray("paymentTransactions", {
        studentId,
        type: type,
        amount: amount,
        description: reason,
        timestamp: new Date().toISOString(),
      })

      // Bildirishnoma yuborish
      await this.sendNotification([studentId], {
        type: "payment",
        title: amount > 0 ? "Coin qo'shildi" : "Coin ayirildi",
        message: `${Math.abs(amount).toLocaleString()} coin ${amount > 0 ? "qo'shildi" : "ayirildi"}. Sabab: ${reason}`,
      })

      return true
    } catch (error) {
      console.error("Coin o'zgartirishda xatolik:", error)
      throw error
    }
  }

  // O'quvchi ismini yangilash
  async updateStudentName(studentId, newName) {
    try {
      await this.updateInArray("users", studentId, {
        name: newName,
        updatedAt: new Date().toISOString()
      })
      
      // Faoliyat yozish
      await this.logUserActivity(studentId, "name_update", `Ism o'zgartirildi: ${newName}`)
      
      return true
    } catch (error) {
      console.error("Ism yangilashda xatolik:", error)
      throw error
    }
  }

  // Davomat belgilash
  async markAttendance(groupId, date, attendanceData, selectedStudents = null, applyPenalties = true) {
    try {
      // Agar ma'lum o'quvchilar tanlangan bo'lsa, faqat ularni ishlatish
      let finalAttendanceData = attendanceData
      if (selectedStudents && selectedStudents.length > 0) {
        finalAttendanceData = {}
        selectedStudents.forEach(studentId => {
          finalAttendanceData[studentId] = attendanceData[studentId] || false
        })
      }
      
      const attendanceRecord = {
        groupId,
        date,
        attendanceData: finalAttendanceData, // {studentId: true/false}
        markedAt: new Date().toISOString(),
        markedBy: "admin"
      }

      await this.addToArray("attendanceRecords", attendanceRecord)
      return true
    } catch (error) {
      console.error("Davomat belgilashda xatolik:", error)
      throw error
    }
  }

  // Guruh yaratish
  async createGroup(name, description, selectedStudents = []) {
    try {
      const group = {
        name,
        description,
        createdAt: new Date().toISOString(),
        createdBy: "admin",
        studentCount: selectedStudents.length,
        studentIds: selectedStudents
      }

      const groupId = await this.addToArray("groups", group)
      
      // O'quvchilarni guruhga biriktirish
      for (const studentId of selectedStudents) {
        await this.updateInArray("users", studentId, {
          groupId: groupId
        })
      }
      
      return groupId
    } catch (error) {
      console.error("Guruh yaratishda xatolik:", error)
      throw error
    }
  }

  // Statistika olish
  async getStatistics() {
    try {
      const users = await this.getArrayData('users')
      const tasks = await this.getArrayData('tasks')
      const tests = await this.getArrayData('tests')
      const projects = await this.getArrayData('projects')
      const submissions = await this.getArrayData('submissions')
      const testResults = await this.getArrayData('testResults')
      const projectSubmissions = await this.getArrayData('projectSubmissions')
      const monthlyPayments = await this.getArrayData('monthlyPayments')
      const withdrawalRequests = await this.getArrayData('withdrawalRequests')
      
      const students = users.filter(u => u.role === 'student')
      
      // Asosiy statistika
      const totalStudents = students.length
      const totalTasks = tasks.length
      const totalTests = tests.length
      const totalProjects = projects.length
      
      // To'lov statistikasi
      const paidStudents = students.filter(s => s.paymentStatus === 'paid').length
      const unpaidStudents = students.filter(s => s.paymentStatus === 'unpaid').length
      const partialPaidStudents = students.filter(s => s.paymentStatus === 'partial').length
      
      const totalPayments = monthlyPayments.length
      const completedPayments = monthlyPayments.filter(p => p.status === 'paid').length
      const pendingPayments = monthlyPayments.filter(p => p.status === 'pending').length
      
      // Pul yechish statistikasi
      const totalWithdrawals = withdrawalRequests.length
      const approvedWithdrawals = withdrawalRequests.filter(w => w.status === 'approved').length
      const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'pending').length
      
      // Vazifa statistikasi
      const totalSubmissions = submissions.length
      const approvedSubmissions = submissions.filter(s => s.status === 'approved').length
      const pendingSubmissions = submissions.filter(s => s.status === 'pending').length
      
      // Test statistikasi
      const totalTestResults = testResults.length
      const passedTests = testResults.filter(t => t.score >= 70).length
      
      // Loyiha statistikasi
      const totalProjectSubmissions = projectSubmissions.length
      const approvedProjects = projectSubmissions.filter(p => p.status === 'approved').length
      
      return {
        general: {
          totalStudents,
          totalTasks,
          totalTests,
          totalProjects
        },
        payments: {
          paidStudents,
          unpaidStudents,
          partialPaidStudents,
          totalPayments,
          completedPayments,
          pendingPayments,
          paymentRate: totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0
        },
        withdrawals: {
          totalWithdrawals,
          approvedWithdrawals,
          pendingWithdrawals,
          approvalRate: totalWithdrawals > 0 ? Math.round((approvedWithdrawals / totalWithdrawals) * 100) : 0
        },
        tasks: {
          totalSubmissions,
          approvedSubmissions,
          pendingSubmissions,
          approvalRate: totalSubmissions > 0 ? Math.round((approvedSubmissions / totalSubmissions) * 100) : 0
        },
        tests: {
          totalTestResults,
          passedTests,
          passRate: totalTestResults > 0 ? Math.round((passedTests / totalTestResults) * 100) : 0
        },
        projects: {
          totalProjectSubmissions,
          approvedProjects,
          approvalRate: totalProjectSubmissions > 0 ? Math.round((approvedProjects / totalProjectSubmissions) * 100) : 0
        }
      }
    } catch (error) {
      console.error("Statistika olishda xatolik:", error)
      throw error
    }
  }

  // To'lov statistikasi
  async getPaymentStatistics() {
    try {
      const monthlyPayments = await this.getArrayData('monthlyPayments')
      const users = await this.getArrayData('users')
      const paymentTransactions = await this.getArrayData('paymentTransactions')
      
      const students = users.filter(u => u.role === 'student')
      
      // Oylik to'lovlar statistikasi
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const currentMonthPayments = monthlyPayments.filter(p => {
        const paymentDate = new Date(p.createdAt)
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
      })
      
      // Jami to'lovlar
      const totalPaymentAmount = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const paidPaymentAmount = monthlyPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      
      // Coin orqali to'lovlar
      const coinPayments = monthlyPayments.filter(p => p.paymentMethod === 'coins')
      const totalCoinsUsed = coinPayments.reduce((sum, p) => sum + (p.coinsUsed || 0), 0)
      
      // Eng ko'p to'lov qilgan o'quvchilar
      const studentPayments = {}
      paymentTransactions
        .filter(t => t.type === 'payment' && t.amount < 0)
        .forEach(t => {
          if (!studentPayments[t.studentId]) {
            studentPayments[t.studentId] = 0
          }
          studentPayments[t.studentId] += Math.abs(t.amount)
        })
      
      const topPayers = Object.entries(studentPayments)
        .map(([studentId, amount]) => {
          const student = students.find(s => s.id === studentId)
          return {
            studentId,
            studentName: student ? student.name : 'Noma\'lum',
            totalPaid: amount
          }
        })
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 10)
      
      return {
        overview: {
          totalPayments: monthlyPayments.length,
          paidPayments: monthlyPayments.filter(p => p.status === 'paid').length,
          pendingPayments: monthlyPayments.filter(p => p.status === 'pending').length,
          partialPayments: monthlyPayments.filter(p => p.status === 'partial').length,
          totalAmount: totalPaymentAmount,
          paidAmount: paidPaymentAmount,
          collectionRate: totalPaymentAmount > 0 ? Math.round((paidPaymentAmount / totalPaymentAmount) * 100) : 0
        },
        currentMonth: {
          totalPayments: currentMonthPayments.length,
          paidPayments: currentMonthPayments.filter(p => p.status === 'paid').length,
          totalAmount: currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          paidAmount: currentMonthPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0)
        },
        coinPayments: {
          totalCoinPayments: coinPayments.length,
          totalCoinsUsed,
          coinPaymentRate: monthlyPayments.length > 0 ? Math.round((coinPayments.length / monthlyPayments.length) * 100) : 0
        },
        topPayers
      }
    } catch (error) {
      console.error("To'lov statistikasi olishda xatolik:", error)
      throw error
    }
  }

  // Chat xabar yuborish
  async sendChatMessage(studentId, message, imageUrl = null) {
    try {
      const users = await this.getArrayData("users")
      const user = users.find(u => u.id === studentId)

      const chatMessage = {
        studentId,
        studentName: user ? user.name : "Noma'lum",
        message,
        imageUrl,
        timestamp: new Date().toISOString(),
      }

      await this.addToArray("chatMessages", chatMessage)
      return true
    } catch (error) {
      console.error("Chat xabar yuborishda xatolik:", error)
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
      if (!Array.isArray(userIds)) {
        userIds = [userIds]
      }
      
      const notifications = []
      userIds.forEach((userId) => {
        notifications.push({
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority || 'normal', // 'high', 'normal', 'low'
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

  // Bildirishnomalarni o'qilgan deb belgilash
  async markNotificationAsRead(notificationId) {
    try {
      await this.updateInArray("notifications", notificationId, {
        read: true,
        readAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Bildirishnomani o'qilgan deb belgilashda xatolik:", error)
    }
  }

  // Ulanish holatini yangilash
  updateConnectionStatus() {
    const indicator = document.getElementById("connectionIndicator")
    const text = document.getElementById("connectionText")

    if (indicator && text) {
      if (this.isOnline) {
        indicator.className = "w-2 h-2 rounded-full bg-green-400"
        text.textContent = "Online"
      } else {
        indicator.className = "w-2 h-2 rounded-full bg-red-400"
        text.textContent = "Offline"
      }
    }
  }

  // Firebase holatini tekshirish
  getConnectionStatus() {
    return this.isOnline
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