import { firebaseManager } from "./firebase.js"

// Tab switching
document.getElementById("loginTab").addEventListener("click", function () {
  document.getElementById("loginForm").classList.remove("hidden")
  document.getElementById("registerForm").classList.add("hidden")
  this.classList.add("bg-blue-600", "text-white")
  this.classList.remove("text-gray-600")
  document.getElementById("registerTab").classList.remove("bg-blue-600", "text-white")
  document.getElementById("registerTab").classList.add("text-gray-600")
})

document.getElementById("registerTab").addEventListener("click", function () {
  document.getElementById("registerForm").classList.remove("hidden")
  document.getElementById("loginForm").classList.add("hidden")
  this.classList.add("bg-blue-600", "text-white")
  this.classList.remove("text-gray-600")
  document.getElementById("loginTab").classList.remove("bg-blue-600", "text-white")
  document.getElementById("loginTab").classList.add("text-gray-600")
})

// Login form
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  // Basic validation
  if (!email || !password) {
    alert("Email va parolni kiriting!")
    return
  }

  try {
    // Loading state
    const submitButton = e.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = "Yuklanmoqda..."
    submitButton.disabled = true

    // Check internet connection first
    if (!navigator.onLine) {
      throw new Error("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    }

    // Wait a bit for Firebase to initialize
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const user = await firebaseManager.authenticateUser(email.trim(), password)

    if (user) {
      // Foydalanuvchi ma'lumotlarini saqlash (sessionStorage)
      sessionStorage.setItem("currentUser", JSON.stringify(user))

      // Add a small delay before redirect
      await new Promise(resolve => setTimeout(resolve, 500))

      if (user.role === "admin") {
        window.location.href = "admin-dashboard.html"
      } else {
        window.location.href = "student-dashboard.html"
      }
    } else {
      alert("Email yoki parol noto'g'ri!")
    }
  } catch (error) {
    console.error("Login xatoligi:", error)
    if (error.message && error.message.includes("Internet aloqasi")) {
      alert("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    } else if (error.message && error.message.includes("Firebase")) {
      alert("Ma'lumotlar bazasiga ulanishda xatolik! Iltimos, qayta urinib ko'ring.")
    } else {
      alert("Tizimga kirishda xatolik yuz berdi! Iltimos, qayta urinib ko'ring.")
    }
  } finally {
    // Reset button state
    const submitButton = e.target.querySelector('button[type="submit"]')
    submitButton.textContent = originalText || "Kirish"
    submitButton.disabled = false
  }
})

// Register form
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const name = document.getElementById("registerName").value
  const email = document.getElementById("registerEmail").value
  const password = document.getElementById("registerPassword").value
  const telegram = document.getElementById("registerTelegram").value
  const referralCode = document.getElementById("registerReferralCode").value.trim()

  // Basic validation
  if (!name || !email || !password) {
    alert("Barcha majburiy maydonlarni to'ldiring!")
    return
  }

  if (password.length < 6) {
    alert("Parol kamida 6 ta belgidan iborat bo'lishi kerak!")
    return
  }

  try {
    // Loading state
    const submitButton = e.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = "Yuklanmoqda..."
    submitButton.disabled = true

    // Check internet connection first
    if (!navigator.onLine) {
      throw new Error("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    }

    // Wait a bit for Firebase to initialize
    await new Promise(resolve => setTimeout(resolve, 1000))

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      telegram: telegram.trim(),
      referralCode,
    }

    await firebaseManager.registerUser(userData)

    let message = "Ro'yxatdan o'tish muvaffaqiyatli! Endi tizimga kirishingiz mumkin."
    if (referralCode) {
      message += " Referal kodingiz tekshirilmoqda va admin tomonidan tasdiqlanishi kutilmoqda."
    }

    alert(message)

    // Switch to login tab
    document.getElementById("loginTab").click()
    document.getElementById("loginEmail").value = email.trim().toLowerCase()

    // Reset form
    document.getElementById("registerForm").reset()
  } catch (error) {
    console.error("Register xatoligi:", error)
    if (error.message && error.message.includes("Internet aloqasi")) {
      alert("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    } else if (error.message && error.message.includes("Firebase")) {
      alert("Ma'lumotlar bazasiga ulanishda xatolik! Iltimos, qayta urinib ko'ring.")
    } else {
      alert(error.message || "Ro'yxatdan o'tishda xatolik yuz berdi!")
    }
  } finally {
    // Reset button state
    const submitButton = e.target.querySelector('button[type="submit"]')
    submitButton.textContent = originalText || "Ro'yxatdan o'tish"
    submitButton.disabled = false
  }
})