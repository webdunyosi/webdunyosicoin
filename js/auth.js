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

  try {
    // Loading state
    const submitButton = e.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = "Yuklanmoqda..."
    submitButton.disabled = true

    const user = await firebaseManager.authenticateUser(email, password)

    if (user) {
      // Foydalanuvchi ma'lumotlarini saqlash (sessionStorage)
      sessionStorage.setItem("currentUser", JSON.stringify(user))

      if (user.role === "admin") {
        window.location.href = "admin-dashboard.html"
      } else {
        window.location.href = "student-dashboard111.html"
      }
    } else {
      alert("Email yoki parol noto'g'ri!")
    }
  } catch (error) {
    console.error("Login xatoligi:", error)
    if (error.message.includes("Internet aloqasi")) {
      alert("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    } else {
      alert("Tizimga kirishda xatolik yuz berdi!")
    }
  } finally {
    // Reset button state
    const submitButton = e.target.querySelector('button[type="submit"]')
    submitButton.textContent = "Kirish"
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

  try {
    // Loading state
    const submitButton = e.target.querySelector('button[type="submit"]')
    const originalText = submitButton.textContent
    submitButton.textContent = "Yuklanmoqda..."
    submitButton.disabled = true

    const userData = {
      name,
      email,
      password,
      telegram,
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
    document.getElementById("loginEmail").value = email

    // Reset form
    document.getElementById("registerForm").reset()
  } catch (error) {
    console.error("Register xatoligi:", error)
    if (error.message.includes("Internet aloqasi")) {
      alert("Internet aloqasi yo'q! Iltimos, internetni tekshiring.")
    } else {
      alert(error.message || "Ro'yxatdan o'tishda xatolik yuz berdi!")
    }
  } finally {
    // Reset button state
    const submitButton = e.target.querySelector('button[type="submit"]')
    submitButton.textContent = "Ro'yxatdan o'tish"
    submitButton.disabled = false
  }
})