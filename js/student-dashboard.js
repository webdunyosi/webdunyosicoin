import { firebaseManager } from "./firebase.js"

let currentUser = null
let currentTaskId = null
let currentTestId = null
let currentProjectId = null
let timerIntervals = new Map()
let uploadedImage = null

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if user data exists
    const userData = sessionStorage.getItem("currentUser")
    if (!userData) {
      console.log("No user data found, redirecting to login")
      window.location.href = "index.html"
      return
    }

    currentUser = JSON.parse(userData)
    
    if (!currentUser || currentUser.role !== "student") {
      console.log("Invalid user data or not a student, redirecting to login")
      sessionStorage.removeItem("currentUser")
      window.location.href = "index.html"
      return
    }

    // Set student name
    const studentNameElement = document.getElementById("studentName")
    if (studentNameElement) {
      studentNameElement.textContent = currentUser.name
    }

    // Wait for Firebase to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check internet connection
    if (!navigator.onLine) {
      console.warn("No internet connection, some features may not work")
    }

    // Load all data
    await Promise.all([
      updateStudentInfo(),
      checkPaymentStatus(),
      loadTasks(),
      loadTests(),
      loadProjects(),
      loadChat(),
      loadLeaderboard(),
      loadWallet(),
      loadNotifications(),
      loadReferralInfo()
    ])

    // Auto-refresh data every 30 seconds
    setInterval(async () => {
      try {
        if (navigator.onLine) {
          await Promise.all([
            updateStudentInfo(),
            checkPaymentStatus(),
            loadTasks(),
            loadTests(),
            loadProjects(),
            loadChat(),
            loadLeaderboard(),
            loadWallet(),
            loadNotifications(),
            loadReferralInfo()
          ])
        }
      } catch (error) {
        console.error("Auto-refresh xatoligi:", error)
      }
    }, 30000)

    // Add event listeners
    const withdrawalCoinsInput = document.getElementById("withdrawalCoins")
    if (withdrawalCoinsInput) {
      withdrawalCoinsInput.addEventListener("input", updateWithdrawalAmount)
    }

    const withdrawalCardInput = document.getElementById("withdrawalCardNumber")
    if (withdrawalCardInput) {
      withdrawalCardInput.addEventListener("input", formatCardNumber)
    }

    const chatInput = document.getElementById("chatInput")
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          sendMessage()
        }
      })
    }

  } catch (error) {
    console.error("Initialization xatoligi:", error)
    alert("Sahifani yuklashda xatolik yuz berdi! Iltimos, sahifani yangilang.")
    // Redirect to login on critical error
    setTimeout(() => {
      window.location.href = "index.html"
    }, 2000)
  }
})

// Remove the old initialization code
/*
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = JSON.parse(sessionStorage.getItem("currentUser"))
  if (!currentUser || currentUser.role !== "student") {
    window.location.href = "index.html"
    return
  }

  document.getElementById("studentName").textContent = currentUser.name

  try {
    await updateStudentInfo()
    await checkPaymentStatus()
    await loadTasks()
    await loadTests()
    await loadProjects()
    await loadChat()
    await loadLeaderboard()
    await loadWallet()
    await loadNotifications()
    await loadReferralInfo()

    // Auto-refresh data every 30 seconds
    setInterval(async () => {
      try {
        await updateStudentInfo()
        await checkPaymentStatus()
        await loadTasks()
        await loadTests()
        await loadProjects()
        await loadChat()
        await loadLeaderboard()
        await loadWallet()
        await loadNotifications()
        await loadReferralInfo()
      } catch (error) {
        console.error("Auto-refresh xatoligi:", error)
      }
    }, 30000)

    // Add event listener for withdrawal coins input
    document.getElementById("withdrawalCoins").addEventListener("input", updateWithdrawalAmount)

    // Format card number input
    document.getElementById("withdrawalCardNumber").addEventListener("input", formatCardNumber)
  } catch (error) {
    console.error("Initialization xatoligi:", error)
    alert("Ma'lumotlarni yuklashda xatolik yuz berdi!")
  }
})
*/

// To'lov holatini tekshirish
async function checkPaymentStatus() {
  try {
    const users = await firebaseManager.getArrayData("users")
    const user = users.find(u => u.id === currentUser.id)
    
    if (user && user.paymentStatus === "unpaid" && user.paymentAmount) {
      // To'lov kerak bo'lgan holatni ko'rsatish
      showPaymentAlert(user)
    } else {
      hidePaymentAlert()
    }
  } catch (error) {
    console.error("To'lov holatini tekshirishda xatolik:", error)
  }
}

function showPaymentAlert(user) {
  const paymentAlert = document.getElementById("paymentAlert")
  const paymentStatusCard = document.getElementById("paymentStatusCard")
  const paymentStatusIndicator = document.getElementById("paymentStatusIndicator")
  
  if (paymentAlert) {
    paymentAlert.classList.remove("hidden")
    document.getElementById("paymentAlertText").textContent = 
      `To'lov kerak: ${user.paymentAmount?.toLocaleString()} so'm`
  }
  
  if (paymentStatusCard) {
    paymentStatusCard.classList.remove("hidden")
    document.getElementById("paymentDescription").textContent = user.paymentDescription || "Oylik to'lov"
    document.getElementById("paymentAmount").textContent = `${user.paymentAmount?.toLocaleString()} so'm`
    
    if (user.paymentDueDate) {
      const dueDate = new Date(user.paymentDueDate)
      document.getElementById("paymentDueDate").textContent = 
        `Muddat: ${dueDate.toLocaleDateString("uz-UZ")}`
    }
  }
  
  if (paymentStatusIndicator) {
    paymentStatusIndicator.classList.remove("hidden")
  }
}

function hidePaymentAlert() {
  const paymentAlert = document.getElementById("paymentAlert")
  const paymentStatusCard = document.getElementById("paymentStatusCard")
  const paymentStatusIndicator = document.getElementById("paymentStatusIndicator")
  
  if (paymentAlert) paymentAlert.classList.add("hidden")
  if (paymentStatusCard) paymentStatusCard.classList.add("hidden")
  if (paymentStatusIndicator) paymentStatusIndicator.classList.add("hidden")
}

function startTimer(elementId, deadline) {
  // Clear existing timer if any
  if (timerIntervals.has(elementId)) {
    clearInterval(timerIntervals.get(elementId))
  }

  const timerElement = document.getElementById(elementId)
  if (!timerElement) return

  const updateTimer = () => {
    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const timeLeft = deadlineTime - now

    if (timeLeft <= 0) {
      timerElement.innerHTML = '<span class="text-red-600 font-bold animate-pulse">Muddati o\'tgan!</span>'
      clearInterval(timerIntervals.get(elementId))
      timerIntervals.delete(elementId)
      return
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    let timeDisplay = ""
    if (days > 0) {
      timeDisplay = `${days} kun ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      timeDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    const colorClass = timeLeft < 3600000 ? 'text-red-600' : timeLeft < 7200000 ? 'text-orange-600' : 'text-blue-600'
    timerElement.innerHTML = `<span class="${colorClass} font-mono font-bold animate-timer-pulse">${timeDisplay}</span>`
  }

  updateTimer()
  const interval = setInterval(updateTimer, 1000)
  timerIntervals.set(elementId, interval)
}

async function updateStudentInfo() {
  try {
    const users = await firebaseManager.getArrayData("users")
    const user = users.find((u) => u.id === currentUser.id)
    if (user) {
      document.getElementById("studentRating").textContent = user.rating || 0
      const balance = Math.floor((user.rating || 0) * 10) // 1 coin = 10 so'm
      document.getElementById("studentBalance").textContent = `${balance.toLocaleString()} so'm`
      document.getElementById("walletBalance").textContent = `${balance.toLocaleString()} so'm`
      document.getElementById("walletCoins").textContent = `${user.rating || 0} coin`
      currentUser.rating = user.rating || 0
      currentUser.balance = balance
      currentUser.groupId = user.groupId // Update group ID
      currentUser.paymentStatus = user.paymentStatus
      currentUser.paymentAmount = user.paymentAmount

      // Update mobile stats
      if (document.getElementById("studentRatingMobile")) {
        document.getElementById("studentRatingMobile").textContent = `${user.rating || 0} coin`
      }
      if (document.getElementById("studentBalanceMobile")) {
        document.getElementById("studentBalanceMobile").textContent = `${balance.toLocaleString()} so'm`
      }

      // Update color based on balance
      const ratingElement = document.getElementById("studentRating")
      const balanceElement = document.getElementById("studentBalance")
      const walletBalanceElement = document.getElementById("walletBalance")
      const walletCoinsElement = document.getElementById("walletCoins")

      if ((user.rating || 0) < 0) {
        ratingElement.className = "text-sm sm:text-lg font-bold text-red-600"
        balanceElement.className = "text-xs text-red-600"
        walletBalanceElement.className = "text-3xl font-bold text-red-600 mb-2"
        walletCoinsElement.className = "text-2xl font-bold text-red-600 mb-1"
      } else {
        ratingElement.className = "text-sm sm:text-lg font-bold text-blue-600"
        balanceElement.className = "text-xs text-green-600"
        walletBalanceElement.className = "text-3xl font-bold text-green-600 mb-2"
        walletCoinsElement.className = "text-2xl font-bold text-blue-600 mb-1"
      }
    }
  } catch (error) {
    console.error("O'quvchi ma'lumotlarini yangilashda xatolik:", error)
  }
}

function updateWithdrawalAmount() {
  const coins = Number.parseInt(document.getElementById("withdrawalCoins").value) || 0
  const amount = coins * 10 // 1 coin = 10 so'm
  document.getElementById("withdrawalAmount").textContent = `${amount.toLocaleString()} so'm`
}

function formatCardNumber(e) {
  const value = e.target.value.replace(/\s/g, "").replace(/[^0-9]/gi, "")
  const formattedValue = value.match(/.{1,4}/g)?.join(" ") || value
  e.target.value = formattedValue
}

function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden")
  })

  // Show selected tab
  document.getElementById(tabName + "Content").classList.remove("hidden")

  // Update menu card active state
  document.querySelectorAll(".menu-card").forEach((card) => {
    if (!card.classList.contains("bg-gradient-to-br")) {
      card.classList.remove("active")
      card.style.background = ""
      card.style.color = ""
      card.style.border = ""
      const icon = card.querySelector(".menu-icon")
      const title = card.querySelector("h3")
      if (icon) {
        icon.classList.remove("text-white")
        icon.classList.add("text-gray-600")
      }
      if (title) {
        title.classList.remove("text-white")
        title.classList.add("text-gray-800")
      }
    }
  })

  // Set active menu card
  const activeCard = event?.target?.closest(".menu-card")
  if (activeCard) {
    if (!activeCard.classList.contains("bg-gradient-to-br")) {
      activeCard.classList.add("active")
      const icon = activeCard.querySelector(".menu-icon")
      const title = activeCard.querySelector("h3")
      if (icon) {
        icon.classList.remove("text-gray-600")
        icon.classList.add("text-white")
      }
      if (title) {
        title.classList.remove("text-gray-800")
        title.classList.add("text-white")
      }
    }
  }
}

// Vazifa topshirish turi ko'rsatish
function showSubmissionType(type) {
  // Barcha submission turlarini yashirish
  document.querySelectorAll('.submission-type').forEach(el => {
    el.classList.add('hidden')
  })
  
  // Tanlangan turni ko'rsatish
  document.getElementById(type + 'Submission').classList.remove('hidden')
  
  // Button holatini yangilash
  document.querySelectorAll('[onclick^="showSubmissionType"]').forEach(btn => {
    btn.classList.remove('border-blue-500', 'bg-blue-50')
    btn.classList.add('border-gray-200')
  })
  
  event.target.closest('button').classList.add('border-blue-500', 'bg-blue-50')
  event.target.closest('button').classList.remove('border-gray-200')
}

// Rasm yuklash
function handleImageUpload(input) {
  const file = input.files[0]
  if (!file) return
  
  // Fayl hajmini tekshirish (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Rasm hajmi 5MB dan kichik bo\'lishi kerak!')
    input.value = ''
    return
  }
  
  // Fayl turini tekshirish
  if (!file.type.startsWith('image/')) {
    alert('Faqat rasm fayllarini yuklash mumkin!')
    input.value = ''
    return
  }
  
  const reader = new FileReader()
  reader.onload = function(e) {
    uploadedImage = e.target.result
    
    // Preview ko'rsatish
    document.getElementById('previewImg').src = uploadedImage
    document.getElementById('imageUploadArea').classList.add('hidden')
    document.getElementById('imagePreview').classList.remove('hidden')
  }
  reader.readAsDataURL(file)
}

async function loadTasks() {
  try {
    const tasks = await firebaseManager.getArrayData("tasks")
    const submissions = await firebaseManager.getArrayData("submissions")
    const groups = await firebaseManager.getArrayData("groups")

    // Get current user's updated info to ensure we have latest groupId
    const users = await firebaseManager.getArrayData("users")
    const currentUserData = users.find(u => u.id === currentUser.id)
    if (currentUserData) {
      currentUser.groupId = currentUserData.groupId
    }

    // Get tasks assigned to user or their group
    const myTasks = tasks.filter((task) => {
      if (task.status !== "active") return false
      
      // Check if task is assigned directly to user
      if (task.assignedTo && task.assignedTo.includes(currentUser.id)) return true
      
      // Check if task is assigned to user's group
      if (currentUser.groupId) {
        // Check if task has assignedGroups array and includes user's group
        if (task.assignedGroups && task.assignedGroups.includes(currentUser.groupId)) return true
        
        // Also check if task was assigned to "group" type and matches user's group
        if (task.assignmentType === "group" && task.groupId === currentUser.groupId) return true
        
        // Check if user's group members are in assignedTo array (for backward compatibility)
        if (task.assignmentType === "group" && task.assignedTo) {
          const groupMembers = users.filter(u => u.groupId === currentUser.groupId).map(u => u.id)
          return task.assignedTo.some(id => groupMembers.includes(id))
        }
      }
      
      // Check if task is assigned to all students
      if (task.assignmentType === "all") return true
      
      return false
    })

    const tasksList = document.getElementById("tasksList")
    tasksList.innerHTML = ""

    if (myTasks.length === 0) {
      tasksList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha vazifalar yo\'q</p>'
      return
    }

    myTasks.forEach((task, index) => {
      const deadline = new Date(task.deadline)
      const now = new Date()
      const isOverdue = deadline < now
      const mySubmission = submissions.find((s) => s.taskId === task.id && s.studentId === currentUser.id)

      const taskElement = document.createElement("div")
      taskElement.className = `border rounded-lg p-4 ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`
      
      const timerId = `timer-${task.id}`
      
      taskElement.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-2 gap-4">
          <h3 class="font-semibold text-lg">${task.title}</h3>
          <div class="text-right">
            <div id="${timerId}" class="text-sm px-2 py-1 rounded-full bg-blue-100 mb-1">
              <!-- Timer will be inserted here -->
            </div>
            ${mySubmission && mySubmission.status === "approved" ? `<div class="text-sm text-green-600 font-medium">${mySubmission.points || task.reward || 50} coin olindi</div>` : ""}
          </div>
        </div>
        <p class="text-gray-700 mb-3">${task.description}</p>
        ${task.link ? `<p class="text-sm mb-3"><a href="${task.link}" target="_blank" class="text-blue-600 hover:underline break-all">Vazifa havolasi</a></p>` : ""}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span class="text-sm text-gray-500">Muddat: ${deadline.toLocaleDateString("uz-UZ")} ${deadline.toLocaleTimeString("uz-UZ", {hour: '2-digit', minute: '2-digit'})}</span>
          ${
            mySubmission
              ? `
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-1 rounded-full text-xs ${
                mySubmission.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : mySubmission.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }">
                ${
                  mySubmission.status === "approved"
                    ? "Tasdiqlangan"
                    : mySubmission.status === "rejected"
                      ? "Rad etilgan"
                      : "Kutilmoqda"
                }
              </span>
              ${mySubmission.feedback ? `<div class="text-xs text-red-600">Izoh: ${mySubmission.feedback}</div>` : ""}
            </div>
          `
              : `
            <button onclick="openTaskModal('${task.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Bajarish
            </button>
          `
          }
        </div>
      `
      tasksList.appendChild(taskElement)

      // Start timer for this task
      if (!isOverdue && !mySubmission) {
        startTimer(timerId, task.deadline)
      }
    })
  } catch (error) {
    console.error("Vazifalarni yuklashda xatolik:", error)
    document.getElementById("tasksList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadTests() {
  try {
    const tests = await firebaseManager.getArrayData("tests")
    const testResults = await firebaseManager.getArrayData("testResults")

    const testsList = document.getElementById("testsList")
    testsList.innerHTML = ""

    if (tests.length === 0) {
      testsList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha testlar yo\'q</p>'
      return
    }

    tests.forEach((test) => {
      const myResult = testResults.find((r) => r.testId === test.id && r.studentId === currentUser.id)

      const testElement = document.createElement("div")
      testElement.className = "border rounded-lg p-4"
      testElement.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold text-lg">${test.title}</h3>
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">${test.questions.length} savol</span>
        </div>
        <p class="text-gray-700 mb-3">${test.description}</p>
        <div class="flex justify-between items-center">
          ${
            myResult
              ? `<span class="text-sm text-gray-600">Natija: ${myResult.score}/${test.questions.length}</span>`
              : `<span class="text-sm text-gray-600">Test bajarilmagan</span>`
          }
          ${
            myResult
              ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Bajarilgan</span>`
              : `<button onclick="openTestModal('${test.id}')" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Testni boshlash
            </button>`
          }
        </div>
      `
      testsList.appendChild(testElement)
    })
  } catch (error) {
    console.error("Testlarni yuklashda xatolik:", error)
    document.getElementById("testsList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadProjects() {
  try {
    const projects = await firebaseManager.getArrayData("projects")
    const projectSubmissions = await firebaseManager.getArrayData("projectSubmissions")

    // Get current user's updated info to ensure we have latest groupId
    const users = await firebaseManager.getArrayData("users")
    const currentUserData = users.find(u => u.id === currentUser.id)
    if (currentUserData) {
      currentUser.groupId = currentUserData.groupId
    }

    const myProjects = projects.filter((project) => {
      // Check if project is assigned directly to user
      if (project.assignedTo && project.assignedTo.includes(currentUser.id)) return true
      
      // Check if project is assigned to user's group
      if (currentUser.groupId) {
        // Check if project has assignedGroups array and includes user's group
        if (project.assignedGroups && project.assignedGroups.includes(currentUser.groupId)) return true
        
        // Also check if project was assigned to "group" type and matches user's group
        if (project.assignmentType === "group" && project.groupId === currentUser.groupId) return true
        
        // Check if user's group members are in assignedTo array (for backward compatibility)
        if (project.assignmentType === "group" && project.assignedTo) {
          const groupMembers = users.filter(u => u.groupId === currentUser.groupId).map(u => u.id)
          return project.assignedTo.some(id => groupMembers.includes(id))
        }
      }
      
      // Check if project is assigned to all students
      if (project.assignmentType === "all") return true
      
      return false
    })

    const projectsList = document.getElementById("projectsList")
    projectsList.innerHTML = ""

    if (myProjects.length === 0) {
      projectsList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha loyihalar yo\'q</p>'
      return
    }

    myProjects.forEach((project) => {
      const deadline = new Date(project.deadline)
      const now = new Date()
      const isOverdue = deadline < now
      const mySubmission = projectSubmissions.find((s) => s.projectId === project.id && s.studentId === currentUser.id)

      const projectElement = document.createElement("div")
      projectElement.className = `border rounded-lg p-4 ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`
      
      const timerId = `project-timer-${project.id}`
      
      projectElement.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold text-lg">${project.title}</h3>
          <div class="text-right">
            <div id="${timerId}" class="text-sm px-2 py-1 rounded-full bg-blue-100 mb-1">
              <!-- Timer will be inserted here -->
            </div>
            <div class="text-sm text-purple-600 font-medium">${project.payment} coin</div>
          </div>
        </div>
        <p class="text-gray-700 mb-3">${project.description}</p>
        ${project.link ? `<p class="text-sm mb-3"><a href="${project.link}" target="_blank" class="text-blue-600 hover:underline break-all">Loyiha havolasi</a></p>` : ""}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span class="text-sm text-gray-500">Muddat: ${deadline.toLocaleDateString("uz-UZ")} ${deadline.toLocaleTimeString("uz-UZ", {hour: '2-digit', minute: '2-digit'})}</span>
          ${
            mySubmission
              ? `
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-1 rounded-full text-xs ${
                mySubmission.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : mySubmission.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }">
                ${
                  mySubmission.status === "approved"
                    ? "Tasdiqlangan"
                    : mySubmission.status === "rejected"
                      ? "Rad etilgan"
                      : "Kutilmoqda"
                }
              </span>
              ${mySubmission.feedback ? `<div class="text-xs text-red-600">Izoh: ${mySubmission.feedback}</div>` : ""}
            </div>
          `
              : `
            <button onclick="openProjectModal('${project.id}')" class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
              Topshirish
            </button>
          `
          }
        </div>
      `
      projectsList.appendChild(projectElement)

      // Start timer for this project
      if (!isOverdue && !mySubmission) {
        startTimer(timerId, project.deadline)
      }
    })
  } catch (error) {
    console.error("Loyihalarni yuklashda xatolik:", error)
    document.getElementById("projectsList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadChat() {
  try {
    const messages = await firebaseManager.getArrayData("chatMessages")
    const chatMessages = document.getElementById("chatMessages")

    chatMessages.innerHTML = ""

    messages.forEach((message) => {
      const messageElement = document.createElement("div")
      messageElement.className = `mb-2 ${message.senderId === currentUser.id ? "text-right" : "text-left"}`

      let messageContent = message.text
      if (message.image) {
        messageContent = `<img src="${message.image}" class="max-w-xs rounded-lg mb-2" alt="Rasm"><br>${message.text}`
      }

      messageElement.innerHTML = `
        <div class="inline-block max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
          message.senderId === currentUser.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
        }">
          <div class="text-xs opacity-75 mb-1">${message.senderName}</div>
          <div>${messageContent}</div>
          <div class="text-xs opacity-75 mt-1">${new Date(message.timestamp).toLocaleTimeString("uz-UZ")}</div>
        </div>
      `
      chatMessages.appendChild(messageElement)
    })

    chatMessages.scrollTop = chatMessages.scrollHeight
  } catch (error) {
    console.error("Chatni yuklashda xatolik:", error)
  }
}

async function loadLeaderboard() {
  try {
    const users = await firebaseManager.getArrayData("users")
    let students = users.filter((u) => u.role === "student")

    // Filter by group if user is in a group
    if (currentUser.groupId) {
      students = students.filter((s) => s.groupId === currentUser.groupId)
    }

    students.sort((a, b) => (b.rating || 0) - (a.rating || 0))

    const leaderboardList = document.getElementById("leaderboardList")
    leaderboardList.innerHTML = ""

    students.forEach((student, index) => {
      const isCurrentUser = student.id === currentUser.id
      const balance = Math.floor((student.rating || 0) * 10)
      const leaderboardItem = document.createElement("div")
      leaderboardItem.className = `flex items-center justify-between p-3 rounded-lg ${
        isCurrentUser ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"
      }`
      leaderboardItem.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full ${
            index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-gray-300"
          } flex items-center justify-center text-white font-bold">
            ${index + 1}
          </div>
          <div>
            <div class="font-medium ${isCurrentUser ? "text-blue-800" : "text-gray-800"}">${student.name}</div>
            <div class="text-sm text-gray-600">${student.email}</div>
            <div class="text-xs ${balance >= 0 ? "text-green-600" : "text-red-600"}">${balance.toLocaleString()} so'm</div>
          </div>
        </div>
        <div class="text-lg font-bold ${isCurrentUser ? ((student.rating || 0) >= 0 ? "text-blue-600" : "text-red-600") : (student.rating || 0) >= 0 ? "text-gray-800" : "text-red-600"}">
          ${student.rating || 0} coin
        </div>
      `
      leaderboardList.appendChild(leaderboardItem)
    })
  } catch (error) {
    console.error("Reytingni yuklashda xatolik:", error)
  }
}

async function loadNotifications() {
  try {
    const notifications = await firebaseManager.getArrayData("notifications")
    const myNotifications = notifications.filter((n) => n.userId === currentUser.id)
    const unreadCount = myNotifications.filter((n) => !n.read).length

    // Update badge
    const badge = document.getElementById("notificationBadge")
    if (unreadCount > 0) {
      badge.textContent = unreadCount
      badge.classList.remove("hidden")
    } else {
      badge.classList.add("hidden")
    }

    // Load notification list
    const notificationList = document.getElementById("notificationList")
    notificationList.innerHTML = ""

    if (myNotifications.length === 0) {
      notificationList.innerHTML = '<p class="text-gray-500 text-center py-4">Bildirishnomalar yo\'q</p>'
      return
    }

    myNotifications
      .slice(-10)
      .reverse()
      .forEach((notification) => {
        const notificationItem = document.createElement("div")
        notificationItem.className = `p-3 border-b hover:bg-gray-50 ${!notification.read ? "bg-blue-50" : ""}`
        notificationItem.innerHTML = `
        <div class="flex items-start space-x-3">
          <i class="fas ${getNotificationIcon(notification.type)} text-blue-600 mt-1"></i>
          <div class="flex-1">
            <h4 class="font-medium text-sm">${notification.title}</h4>
            <p class="text-xs text-gray-600">${notification.message}</p>
            <p class="text-xs text-gray-500 mt-1">${new Date(notification.timestamp).toLocaleString("uz-UZ")}</p>
          </div>
          ${!notification.read ? '<div class="w-2 h-2 bg-blue-600 rounded-full"></div>' : ""}
        </div>
      `
        notificationList.appendChild(notificationItem)
      })
  } catch (error) {
    console.error("Bildirishnomalarni yuklashda xatolik:", error)
  }
}

async function loadReferralInfo() {
  try {
    // Set referral code in about section
    document.getElementById("userReferralCode").textContent = currentUser.referralCode || "NONE"
    document.getElementById("myReferralCode").textContent = currentUser.referralCode || "NONE"

    // Load referral history
    const referrals = await firebaseManager.getArrayData("referrals")
    const myReferrals = referrals.filter((r) => r.referrerId === currentUser.id)

    const referralHistory = document.getElementById("referralHistory")
    referralHistory.innerHTML = ""

    if (myReferrals.length === 0) {
      referralHistory.innerHTML = '<p class="text-gray-500 text-center py-4">Hozircha referallar yo\'q</p>'
      return
    }

    myReferrals.forEach((referral) => {
      const historyItem = document.createElement("div")
      historyItem.className = "flex justify-between items-center p-3 border rounded-lg"
      historyItem.innerHTML = `
        <div>
          <div class="font-medium">${referral.newUserName}</div>
          <div class="text-sm text-gray-600">${referral.newUserEmail}</div>
          <div class="text-xs text-gray-500">${new Date(referral.requestedAt).toLocaleDateString("uz-UZ")}</div>
        </div>
        <div class="text-right">
          <span class="px-2 py-1 rounded-full text-xs ${
            referral.status === "approved"
              ? "bg-green-100 text-green-800"
              : referral.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
          }">
            ${
              referral.status === "approved"
                ? "Tasdiqlangan"
                : referral.status === "rejected"
                  ? "Rad etilgan"
                  : "Kutilmoqda"
            }
          </span>
          ${referral.status === "approved" ? '<div class="text-sm font-bold text-green-600">+20,000 coin</div>' : ""}
        </div>
      `
      referralHistory.appendChild(historyItem)
    })
  } catch (error) {
    console.error("Referal ma'lumotlarini yuklashda xatolik:", error)
  }
}

function copyReferralCode() {
  const code = currentUser.referralCode
  if (code) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        alert("Referal kodi nusxalandi: " + code)
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = code
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        alert("Referal kodi nusxalandi: " + code)
      })
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "task":
      return "fa-tasks"
    case "test":
      return "fa-clipboard-check"
    case "project":
      return "fa-project-diagram"
    case "payment":
      return "fa-money-bill"
    default:
      return "fa-bell"
  }
}

function toggleNotifications() {
  const dropdown = document.getElementById("notificationDropdown")
  dropdown.classList.toggle("hidden")
}

async function markAllAsRead() {
  try {
    const notifications = await firebaseManager.getArrayData("notifications")
    const updates = {}

    notifications.forEach((n) => {
      if (n.userId === currentUser.id && !n.read) {
        updates[n.id] = { ...n, read: true }
      }
    })

    // Update all notifications at once
    for (const [id, notification] of Object.entries(updates)) {
      await firebaseManager.updateInArray("notifications", id, { read: true })
    }

    await loadNotifications()
  } catch (error) {
    console.error("Bildirishnomalarni o'qilgan deb belgilashda xatolik:", error)
  }
}

function openTaskModal(taskId) {
  currentTaskId = taskId
  uploadedImage = null
  
  firebaseManager.getArrayData("tasks").then((tasks) => {
    const task = tasks.find((t) => t.id === taskId)

    if (task) {
      document.getElementById("modalTaskTitle").textContent = task.title
      document.getElementById("modalTaskDescription").textContent = task.description
      
      // Reset all form fields
      document.getElementById("htmlCode").value = ""
      document.getElementById("cssCode").value = ""
      document.getElementById("jsCode").value = ""
      document.getElementById("taskWebsiteUrl").value = ""
      document.getElementById("imageUpload").value = ""
      
      // Reset submission type display
      document.querySelectorAll('.submission-type').forEach(el => {
        el.classList.add('hidden')
      })
      document.getElementById('codeSubmission').classList.remove('hidden')
      
      // Reset image preview
      document.getElementById('imageUploadArea').classList.remove('hidden')
      document.getElementById('imagePreview').classList.add('hidden')
      
      // Reset button states
      document.querySelectorAll('[onclick^="showSubmissionType"]').forEach(btn => {
        btn.classList.remove('border-blue-500', 'bg-blue-50')
        btn.classList.add('border-gray-200')
      })
      document.querySelector('[onclick="showSubmissionType(\'code\')"]').classList.add('border-blue-500', 'bg-blue-50')
      
      document.getElementById("taskModal").classList.remove("hidden")
      document.getElementById("taskModal").classList.add("flex")
    }
  })
}

function closeTaskModal() {
  document.getElementById("taskModal").classList.add("hidden")
  document.getElementById("taskModal").classList.remove("flex")
  currentTaskId = null
  uploadedImage = null
}

async function submitTask() {
  if (!currentTaskId) {
    alert("Vazifa ID topilmadi!")
    return
  }

  const htmlCode = document.getElementById("htmlCode").value.trim()
  const cssCode = document.getElementById("cssCode").value.trim()
  const jsCode = document.getElementById("jsCode").value.trim()
  const websiteUrl = document.getElementById("taskWebsiteUrl").value.trim()

  // Check if at least one field is filled
  if (!htmlCode && !cssCode && !jsCode && !websiteUrl && !uploadedImage) {
    alert("Kamida bitta maydonni to'ldiring: kod, URL yoki rasm!")
    return
  }

  // Validate URL if provided
  if (websiteUrl) {
    try {
      new URL(websiteUrl)
    } catch {
      alert("To'g'ri URL formatini kiriting! (masalan: https://example.com)")
      return
    }
  }

  try {
    // Show loading state
    const submitButton = document.querySelector('#taskModal button[onclick="submitTask()"]')
    const originalText = submitButton.textContent
    submitButton.textContent = "Yuklanmoqda..."
    submitButton.disabled = true

    const submission = {
      taskId: currentTaskId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      htmlCode: htmlCode || "",
      cssCode: cssCode || "",
      jsCode: jsCode || "",
      websiteUrl: websiteUrl || "",
      submissionImage: uploadedImage || "",
      submittedAt: new Date().toISOString(),
      status: "pending",
    }

    console.log("Submitting task data:", submission)
    
    const submissionId = await firebaseManager.addToArray("submissions", submission)
    console.log("Task submitted with ID:", submissionId)
    
    alert("Vazifa muvaffaqiyatli topshirildi!")
    closeTaskModal()
    await loadTasks()
    
    // Reset button state
    submitButton.textContent = originalText
    submitButton.disabled = false

  } catch (error) {
    console.error("Vazifa topshirishda xatolik:", error)
    alert("Vazifa topshirishda xatolik yuz berdi: " + error.message)
    
    // Reset button state
    const submitButton = document.querySelector('#taskModal button[onclick="submitTask()"]')
    submitButton.textContent = "Topshirish"
    submitButton.disabled = false
  }
}

function openTestModal(testId) {
  currentTestId = testId
  firebaseManager.getArrayData("tests").then((tests) => {
    const test = tests.find((t) => t.id === testId)

    if (test) {
      document.getElementById("modalTestTitle").textContent = test.title
      const questionsContainer = document.getElementById("testQuestions")
      questionsContainer.innerHTML = ""

      test.questions.forEach((question, index) => {
        const questionElement = document.createElement("div")
        questionElement.className = "border rounded-lg p-4"
        questionElement.innerHTML = `
          <h4 class="font-medium mb-3">${index + 1}. ${question.question}</h4>
          <div class="space-y-2">
            ${question.options
              .map(
                (option, optIndex) => `
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="question_${index}" value="${optIndex}" class="text-blue-600">
                <span>${option}</span>
              </label>
            `,
              )
              .join("")}
          </div>
        `
        questionsContainer.appendChild(questionElement)
      })

      document.getElementById("testModal").classList.remove("hidden")
      document.getElementById("testModal").classList.add("flex")
    }
  })
}

function closeTestModal() {
  document.getElementById("testModal").classList.add("hidden")
  document.getElementById("testModal").classList.remove("flex")
  currentTestId = null
}

async function submitTest() {
  if (!currentTestId) return

  try {
    const tests = await firebaseManager.getArrayData("tests")
    const test = tests.find((t) => t.id === currentTestId)

    if (!test) return

    let score = 0
    const answers = []

    test.questions.forEach((question, index) => {
      const selectedOption = document.querySelector(`input[name="question_${index}"]:checked`)
      if (selectedOption) {
        const answerIndex = Number.parseInt(selectedOption.value)
        answers.push(answerIndex)
        if (answerIndex === question.correctAnswer) {
          score++
        }
      } else {
        answers.push(-1)
      }
    })

    const result = {
      testId: currentTestId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      score,
      totalQuestions: test.questions.length,
      answers,
      completedAt: new Date().toISOString(),
    }

    await firebaseManager.addToArray("testResults", result)

    // Update student rating based on test performance
    const percentage = (score / test.questions.length) * 100
    let points = 0
    if (percentage >= 90) points = 10
    else if (percentage >= 80) points = 8
    else if (percentage >= 70) points = 6
    else if (percentage >= 60) points = 4
    else if (percentage >= 50) points = 2

    if (points > 0) {
      const users = await firebaseManager.getArrayData("users")
      const user = users.find((u) => u.id === currentUser.id)
      if (user) {
        await firebaseManager.updateInArray("users", user.id, {
          rating: (user.rating || 0) + points,
        })
      }
    }

    alert(`Test yakunlandi! Natija: ${score}/${test.questions.length} (${points} coin)`)
    closeTestModal()
    await loadTests()
    await loadLeaderboard()
    await updateStudentInfo()
  } catch (error) {
    console.error("Test topshirishda xatolik:", error)
    alert("Test topshirishda xatolik yuz berdi!")
  }
}

function openProjectModal(projectId) {
  currentProjectId = projectId
  firebaseManager.getArrayData("projects").then((projects) => {
    const project = projects.find((p) => p.id === projectId)

    if (project) {
      document.getElementById("projectModalTitle").textContent = `Loyiha: ${project.title}`
      document.getElementById("projectUrl").value = ""
      document.getElementById("projectModal").classList.remove("hidden")
      document.getElementById("projectModal").classList.add("flex")
    }
  })
}

function closeProjectModal() {
  document.getElementById("projectModal").classList.add("hidden")
  document.getElementById("projectModal").classList.remove("flex")
  currentProjectId = null
}

async function submitProjectUrl() {
  if (!currentProjectId) return

  const websiteUrl = document.getElementById("projectUrl").value.trim()
  if (!websiteUrl) {
    alert("Website URL ni kiriting!")
    return
  }

  // Validate URL format
  try {
    new URL(websiteUrl)
  } catch {
    alert("To'g'ri URL formatini kiriting! (masalan: https://example.com)")
    return
  }

  try {
    const submission = {
      projectId: currentProjectId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      websiteUrl,
      submittedAt: new Date().toISOString(),
      status: "pending",
    }

    await firebaseManager.addToArray("projectSubmissions", submission)

    alert("Loyiha URL muvaffaqiyatli topshirildi!")
    closeProjectModal()
    await loadProjects()
  } catch (error) {
    console.error("Loyiha topshirishda xatolik:", error)
    alert("Loyiha topshirishda xatolik yuz berdi!")
  }
}

async function sendMessage() {
  const input = document.getElementById("chatInput")
  const message = input.value.trim()
  const imageInput = document.getElementById("imageInput")
  const imageFile = imageInput.files[0]

  if (!message && !imageFile) return

  try {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const newMessage = {
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: message,
          image: e.target.result,
          timestamp: new Date().toISOString(),
        }
        await firebaseManager.addToArray("chatMessages", newMessage)
        input.value = ""
        imageInput.value = ""
        await loadChat()
      }
      reader.readAsDataURL(imageFile)
    } else {
      const newMessage = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: message,
        timestamp: new Date().toISOString(),
      }
      await firebaseManager.addToArray("chatMessages", newMessage)
      input.value = ""
      await loadChat()
    }
  } catch (error) {
    console.error("Xabar yuborishda xatolik:", error)
    alert("Xabar yuborishda xatolik yuz berdi!")
  }
}

// Enter key to send message
document.getElementById("chatInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage()
  }
})

async function loadWallet() {
  try {
    const balance = Math.floor((currentUser.rating || 0) * 10)
    document.getElementById("walletBalance").textContent = `${balance.toLocaleString()} so'm`
    document.getElementById("walletCoins").textContent = `${currentUser.rating || 0} coin`

    // Load payment history
    const transactions = await firebaseManager.getArrayData("paymentTransactions")
    const myTransactions = transactions.filter((t) => t.studentId === currentUser.id)

    const paymentHistory = document.getElementById("paymentHistory")
    paymentHistory.innerHTML = ""

    if (myTransactions.length === 0) {
      paymentHistory.innerHTML = "<p class=\"text-gray-500 text-center py-4\">Hozircha to'lovlar yo'q</p>"
      return
    }

    myTransactions
      .slice(-10)
      .reverse()
      .forEach((transaction) => {
        const historyItem = document.createElement("div")
        historyItem.className = "flex justify-between items-center p-2 border rounded"
        historyItem.innerHTML = `
        <div>
          <span class="font-medium">${transaction.description}</span>
          <p class="text-xs text-gray-500">${new Date(transaction.timestamp).toLocaleDateString("uz-UZ")}</p>
        </div>
        <div class="text-right">
          <span class="font-medium ${
            transaction.type === "earning"
              ? "text-green-600"
              : transaction.type === "fine"
                ? "text-red-600"
                : "text-blue-600"
          }">
            ${transaction.type === "earning" ? "+" : "-"}${transaction.amount} coin
          </span>
        </div>
      `
        paymentHistory.appendChild(historyItem)
      })
  } catch (error) {
    console.error("Hamyonni yuklashda xatolik:", error)
  }
}

function showWithdrawalModal() {
  document.getElementById("withdrawalModal").classList.remove("hidden")
  document.getElementById("withdrawalModal").classList.add("flex")
}

function closeWithdrawalModal() {
  document.getElementById("withdrawalModal").classList.add("hidden")
  document.getElementById("withdrawalModal").classList.remove("flex")
  document.getElementById("withdrawalCoins").value = ""
  document.getElementById("withdrawalCardNumber").value = ""
  document.getElementById("withdrawalPassword").value = ""
  document.getElementById("withdrawalAmount").textContent = ""
}

async function submitWithdrawal() {
  const coins = Number.parseInt(document.getElementById("withdrawalCoins").value)
  const method = document.getElementById("withdrawalMethod").value
  const cardNumber = document.getElementById("withdrawalCardNumber").value.trim()
  const password = document.getElementById("withdrawalPassword").value

  if (!coins || coins < 1000) {
    alert("Minimal yechish miqdori 1000 coin!")
    return
  }

  if (coins > currentUser.rating) {
    alert("Yetarli coin yo'q!")
    return
  }

  if (!cardNumber || cardNumber.length < 16) {
    alert("To'g'ri karta raqamini kiriting!")
    return
  }

  if (!password) {
    alert("Parolni kiriting!")
    return
  }

  try {
    // Verify password
    const users = await firebaseManager.getArrayData("users")
    const user = users.find((u) => u.id === currentUser.id)
    if (!user || user.password !== password) {
      alert("Parol noto'g'ri!")
      return
    }

    const amount = coins * 10 // 1 coin = 10 so'm

    // Deduct coins from user balance
    await firebaseManager.updateInArray("users", currentUser.id, {
      rating: (user.rating || 0) - coins,
    })

    // Create withdrawal request
    const request = {
      studentId: currentUser.id,
      studentName: currentUser.name,
      coins,
      amount,
      method,
      cardNumber,
      status: "pending",
      requestedAt: new Date().toISOString(),
    }

    const requestId = await firebaseManager.addToArray("withdrawalRequests", request)

    // Record transaction
    await firebaseManager.addToArray("paymentTransactions", {
      studentId: currentUser.id,
      type: "withdrawal",
      amount: coins,
      description: `Pul yechish so'rovi: ${method} ${cardNumber}`,
      timestamp: new Date().toISOString(),
      relatedId: requestId,
    })

    alert(`Pul yechish so'rovi yuborildi! ${coins} coin (${amount.toLocaleString()} so'm)`)
    closeWithdrawalModal()
    await updateStudentInfo()
    await loadWallet()
  } catch (error) {
    console.error("Pul yechish so'rovini yuborishda xatolik:", error)
    alert("Pul yechish so'rovini yuborishda xatolik yuz berdi!")
  }
}

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  const notificationDropdown = document.getElementById("notificationDropdown")
  const notificationButton = e.target.closest("button")

  if (!notificationButton || !notificationButton.onclick?.toString().includes("toggleNotifications")) {
    notificationDropdown.classList.add("hidden")
  }
})

function logout() {
  sessionStorage.removeItem("currentUser")
  window.location.href = "index.html"
}

// Make functions global for onclick handlers
window.showTab = showTab
window.showSubmissionType = showSubmissionType
window.handleImageUpload = handleImageUpload
window.toggleNotifications = toggleNotifications
window.markAllAsRead = markAllAsRead
window.openTaskModal = openTaskModal
window.closeTaskModal = closeTaskModal
window.submitTask = submitTask
window.openTestModal = openTestModal
window.closeTestModal = closeTestModal
window.submitTest = submitTest
window.openProjectModal = openProjectModal
window.closeProjectModal = closeProjectModal
window.submitProjectUrl = submitProjectUrl
window.sendMessage = sendMessage
window.showWithdrawalModal = showWithdrawalModal
window.closeWithdrawalModal = closeWithdrawalModal
window.submitWithdrawal = submitWithdrawal
window.logout = logout
window.copyReferralCode = copyReferralCode