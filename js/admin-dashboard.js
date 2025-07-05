import { firebaseManager } from "./firebase.js"

let currentUser = null
let questionCount = 0
let currentWithdrawalRequest = null

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = JSON.parse(sessionStorage.getItem("currentUser"))
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "index.html"
    return
  }

  try {
    await loadStudents()
    await loadAdminTasks()
    await loadAdminTests()
    await loadAdminProjects()
    await loadResults()
    await loadAttendance()
    await loadPayments()
    await loadChat()
    await loadReferrals()

    // Auto-refresh every 30 seconds
    setInterval(async () => {
      try {
        await loadStudents()
        await loadAdminTasks()
        await loadAdminTests()
        await loadAdminProjects()
        await loadResults()
        await loadAttendance()
        await loadPayments()
        await loadChat()
        await loadReferrals()
      } catch (error) {
        console.error("Auto-refresh xatoligi:", error)
      }
    }, 30000)

    // Set today's date for attendance
    document.getElementById("selectedDate").value = new Date().toISOString().split("T")[0]
  } catch (error) {
    console.error("Initialization xatoligi:", error)
    alert("Ma'lumotlarni yuklashda xatolik yuz berdi!")
  }
})

function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden")
  })

  // Remove active classes from all buttons
  document.querySelectorAll('[id$="Tab"], [id$="TabMobile"]').forEach((btn) => {
    btn.classList.remove("bg-white", "shadow-sm", "text-blue-600", "bg-blue-600", "text-white")
    btn.classList.add("text-gray-600")
  })

  // Show selected tab
  document.getElementById(tabName + "Content").classList.remove("hidden")

  // Update active button styles
  const desktopTab = document.getElementById(tabName + "Tab")
  const mobileTab = document.getElementById(tabName + "TabMobile")

  if (desktopTab) {
    desktopTab.classList.add("bg-white", "shadow-sm", "text-blue-600")
    desktopTab.classList.remove("text-gray-600")
  }

  if (mobileTab) {
    mobileTab.classList.add("bg-blue-600", "text-white")
    mobileTab.classList.remove("text-gray-600")
  }
}

async function loadStudents() {
  try {
    const students = await firebaseManager.getArrayData("users")
    const studentUsers = students.filter((u) => u.role === "student")

    const studentsList = document.getElementById("studentsList")
    studentsList.innerHTML = ""

    if (studentUsers.length === 0) {
      studentsList.innerHTML = "<p class=\"text-gray-500 text-center py-8\">Hozircha o'quvchilar yo'q</p>"
      return
    }

    studentUsers.forEach((student) => {
      const balance = Math.floor((student.rating || 0) * 10)
      const studentElement = document.createElement("div")
      studentElement.className =
        "border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      studentElement.innerHTML = `
        <div>
          <h3 class="font-semibold text-lg">${student.name}</h3>
          <p class="text-gray-600">${student.email}</p>
          <p class="text-sm text-gray-500">Telegram: ${student.telegram}</p>
          <p class="text-sm text-gray-500">Ro'yxatdan o'tgan: ${new Date(student.joinDate).toLocaleDateString("uz-UZ")}</p>
          <p class="text-sm ${balance >= 0 ? "text-green-600" : "text-red-600"}">Hisob: ${balance.toLocaleString()} so'm</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold ${(student.rating || 0) >= 0 ? "text-blue-600" : "text-red-600"}">${student.rating || 0} coin</div>
          <div class="text-sm text-gray-500">Reyting</div>
          <div class="mt-2 space-x-2">
            <button onclick="showFineModal('${student.id}')" class="text-sm bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700">
              Jarimalar
            </button>
            <button onclick="removeStudent('${student.id}')" class="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
              O'chirish
            </button>
          </div>
        </div>
      `
      studentsList.appendChild(studentElement)
    })
  } catch (error) {
    console.error("O'quvchilarni yuklashda xatolik:", error)
    document.getElementById("studentsList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadAdminTasks() {
  try {
    const tasks = await firebaseManager.getArrayData("tasks")
    const submissions = await firebaseManager.getArrayData("submissions")

    const tasksList = document.getElementById("adminTasksList")
    tasksList.innerHTML = ""

    if (tasks.length === 0) {
      tasksList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha vazifalar yo\'q</p>'
      return
    }

    tasks.forEach((task) => {
      const taskSubmissions = submissions.filter((s) => s.taskId === task.id)
      const deadline = new Date(task.deadline)
      const isOverdue = deadline < new Date()

      const taskElement = document.createElement("div")
      taskElement.className = `border rounded-lg p-4 ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`
      taskElement.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-2 gap-4">
          <h3 class="font-semibold text-lg">${task.title}</h3>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded-full ${isOverdue ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}">
              ${isOverdue ? "Muddati o'tgan" : "Faol"}
            </span>
          </div>
        </div>
        <p class="text-gray-700 mb-3">${task.description}</p>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span class="text-sm text-gray-500">Muddat: ${deadline.toLocaleDateString("uz-UZ")}</span>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-gray-600">${taskSubmissions.length} topshirilgan</span>
            <button onclick="viewTaskSubmissions('${task.id}')" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              Ko'rish
            </button>
            <button onclick="deleteTask('${task.id}')" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              O'chirish
            </button>
          </div>
        </div>
      `
      tasksList.appendChild(taskElement)
    })
  } catch (error) {
    console.error("Vazifalarni yuklashda xatolik:", error)
    document.getElementById("adminTasksList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadAdminTests() {
  try {
    const tests = await firebaseManager.getArrayData("tests")
    const testResults = await firebaseManager.getArrayData("testResults")

    const testsList = document.getElementById("adminTestsList")
    testsList.innerHTML = ""

    if (tests.length === 0) {
      testsList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha testlar yo\'q</p>'
      return
    }

    tests.forEach((test) => {
      const results = testResults.filter((r) => r.testId === test.id)

      const testElement = document.createElement("div")
      testElement.className = "border rounded-lg p-4"
      testElement.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-2 gap-4">
          <h3 class="font-semibold text-lg">${test.title}</h3>
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">${test.questions.length} savol</span>
        </div>
        <p class="text-gray-700 mb-3">${test.description}</p>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span class="text-sm text-gray-600">${results.length} o'quvchi bajargan</span>
          <div class="flex flex-wrap gap-2">
            <button onclick="viewTestResults('${test.id}')" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
              Natijalar
            </button>
            <button onclick="deleteTest('${test.id}')" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              O'chirish
            </button>
          </div>
        </div>
      `
      testsList.appendChild(testElement)
    })
  } catch (error) {
    console.error("Testlarni yuklashda xatolik:", error)
    document.getElementById("adminTestsList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadAdminProjects() {
  try {
    const projects = await firebaseManager.getArrayData("projects")
    const projectSubmissions = await firebaseManager.getArrayData("projectSubmissions")

    const projectsList = document.getElementById("adminProjectsList")
    projectsList.innerHTML = ""

    if (projects.length === 0) {
      projectsList.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha loyihalar yo\'q</p>'
      return
    }

    projects.forEach((project) => {
      const deadline = new Date(project.deadline)
      const isOverdue = deadline < new Date()
      const submissions = projectSubmissions.filter((s) => s.projectId === project.id)

      const projectElement = document.createElement("div")
      projectElement.className = `border rounded-lg p-4 ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`
      projectElement.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-2 gap-4">
          <h3 class="font-semibold text-lg">${project.title}</h3>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded-full ${isOverdue ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}">
              ${isOverdue ? "Muddati o'tgan" : "Faol"}
            </span>
            <div class="text-sm text-purple-600 font-medium">${project.payment || 0} coin</div>
          </div>
        </div>
        <p class="text-gray-700 mb-3">${project.description}</p>
        ${project.link ? `<p class="text-sm text-blue-600 mb-3"><a href="${project.link}" target="_blank" class="hover:underline">Loyiha havolasi</a></p>` : ""}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span class="text-sm text-gray-500">Muddat: ${deadline.toLocaleDateString("uz-UZ")}</span>
          <div class="flex flex-wrap gap-2">
            <span class="text-sm text-gray-600">${submissions.length} topshirilgan</span>
            <button onclick="viewProjectSubmissions('${project.id}')" class="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
              Ko'rish
            </button>
            <button onclick="deleteProject('${project.id}')" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              O'chirish
            </button>
          </div>
        </div>
      `
      projectsList.appendChild(projectElement)
    })
  } catch (error) {
    console.error("Loyihalarni yuklashda xatolik:", error)
    document.getElementById("adminProjectsList").innerHTML =
      '<p class="text-red-500 text-center py-8">Ma\'lumotlarni yuklashda xatolik!</p>'
  }
}

async function loadResults() {
  try {
    // Load leaderboard
    const users = await firebaseManager.getArrayData("users")
    const students = users.filter((u) => u.role === "student").sort((a, b) => (b.rating || 0) - (a.rating || 0))

    const leaderboard = document.getElementById("adminLeaderboard")
    leaderboard.innerHTML = ""

    students.slice(0, 10).forEach((student, index) => {
      const balance = Math.floor((student.rating || 0) * 10)
      const leaderboardItem = document.createElement("div")
      leaderboardItem.className = "flex items-center justify-between p-2 rounded bg-gray-50"
      leaderboardItem.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded-full ${
            index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-gray-300"
          } flex items-center justify-center text-white text-sm font-bold">
            ${index + 1}
          </span>
          <span class="font-medium">${student.name}</span>
        </div>
        <div class="text-right">
          <span class="font-bold ${(student.rating || 0) >= 0 ? "text-blue-600" : "text-red-600"}">${student.rating || 0} coin</span>
          <div class="text-xs ${balance >= 0 ? "text-green-600" : "text-red-600"}">${balance.toLocaleString()} so'm</div>
        </div>
      `
      leaderboard.appendChild(leaderboardItem)
    })

    // Load recent test results
    const testResults = await firebaseManager.getArrayData("testResults")
    const recentResults = testResults.slice(-10).reverse()

    const resultsContainer = document.getElementById("testResults")
    resultsContainer.innerHTML = ""

    recentResults.forEach((result) => {
      const percentage = Math.round((result.score / result.totalQuestions) * 100)
      const resultItem = document.createElement("div")
      resultItem.className = "flex items-center justify-between p-2 rounded bg-gray-50"
      resultItem.innerHTML = `
        <div>
          <div class="font-medium">${result.studentName}</div>
          <div class="text-sm text-gray-600">${new Date(result.completedAt).toLocaleDateString("uz-UZ")}</div>
        </div>
        <div class="text-right">
          <div class="font-bold ${percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600"}">
            ${result.score}/${result.totalQuestions}
          </div>
          <div class="text-sm text-gray-600">${percentage}%</div>
        </div>
      `
      resultsContainer.appendChild(resultItem)
    })
  } catch (error) {
    console.error("Natijalarni yuklashda xatolik:", error)
  }
}

async function loadAttendance() {
  try {
    const users = await firebaseManager.getArrayData("users")
    const students = users.filter((u) => u.role === "student")
    const attendanceRecords = await firebaseManager.getArrayData("attendanceRecords")
    const selectedDate = document.getElementById("selectedDate").value

    // Check if this date is locked
    const lockedDates = (await firebaseManager.getData("lockedAttendanceDates")) || []
    const isLocked = lockedDates.includes(selectedDate)

    const attendanceList = document.getElementById("attendanceList")
    attendanceList.innerHTML = ""

    // Add locked status indicator
    if (isLocked) {
      const lockedIndicator = document.createElement("div")
      lockedIndicator.className = "bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-4"
      lockedIndicator.innerHTML = `
        <div class="flex items-center">
          <i class="fas fa-lock mr-2"></i>
          <span class="font-medium">Bu sanada davomat tasdiqlangan va o'zgartirib bo'lmaydi!</span>
        </div>
      `
      attendanceList.appendChild(lockedIndicator)
    }

    students.forEach((student) => {
      const todayAttendance = attendanceRecords.find((r) => r.studentId === student.id && r.date === selectedDate)

      const attendanceItem = document.createElement("div")
      attendanceItem.className =
        "flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-4"
      attendanceItem.innerHTML = `
        <div>
          <h3 class="font-semibold">${student.name}</h3>
          <p class="text-sm text-gray-600">${student.email}</p>
          ${todayAttendance?.fineAmount ? `<p class="text-sm text-red-600">Jarima: ${todayAttendance.fineAmount} coin</p>` : ""}
          ${todayAttendance?.recordedAt ? `<p class="text-xs text-gray-500">Belgilangan: ${new Date(todayAttendance.recordedAt).toLocaleString("uz-UZ")}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="${isLocked ? "alert('Bu sanada davomat tasdiqlangan!')" : `markAttendance('${student.id}', 'present')`}" 
                  class="px-3 py-1 rounded text-sm ${todayAttendance?.status === "present" ? "bg-green-600 text-white" : isLocked ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-green-100"}"
                  ${isLocked ? "disabled" : ""}>
            Keldi
          </button>
          <button onclick="${isLocked ? "alert('Bu sanada davomat tasdiqlangan!')" : `markAttendance('${student.id}', 'late')`}" 
                  class="px-3 py-1 rounded text-sm ${todayAttendance?.status === "late" ? "bg-yellow-600 text-white" : isLocked ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-yellow-100"}"
                  ${isLocked ? "disabled" : ""}>
            Kech keldi
          </button>
          <button onclick="${isLocked ? "alert('Bu sanada davomat tasdiqlangan!')" : `markAttendance('${student.id}', 'absent')`}" 
                  class="px-3 py-1 rounded text-sm ${todayAttendance?.status === "absent" ? "bg-red-600 text-white" : isLocked ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-red-100"}"
                  ${isLocked ? "disabled" : ""}>
            Kelmadi
          </button>
        </div>
      `
      attendanceList.appendChild(attendanceItem)
    })
  } catch (error) {
    console.error("Davomatni yuklashda xatolik:", error)
  }
}

async function loadPayments() {
  try {
    const withdrawalRequests = await firebaseManager.getArrayData("withdrawalRequests")
    const paymentTransactions = await firebaseManager.getArrayData("paymentTransactions")
    const users = await firebaseManager.getArrayData("users")

    // Load withdrawal requests
    const withdrawalContainer = document.getElementById("withdrawalRequests")
    withdrawalContainer.innerHTML = ""

    const pendingRequests = withdrawalRequests.filter((r) => r.status === "pending")

    if (pendingRequests.length === 0) {
      withdrawalContainer.innerHTML = "<p class=\"text-gray-500 text-center py-4\">Hozircha so'rovlar yo'q</p>"
    } else {
      pendingRequests.forEach((request) => {
        const requestElement = document.createElement("div")
        requestElement.className = "border rounded-lg p-4"
        requestElement.innerHTML = `
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h4 class="font-semibold">${request.studentName}</h4>
              <p class="text-sm text-gray-600">${request.coins} coin (${request.amount.toLocaleString()} so'm)</p>
              <p class="text-sm text-gray-600">${request.method}: ${request.cardNumber}</p>
              <p class="text-xs text-gray-500">${new Date(request.requestedAt).toLocaleString("uz-UZ")}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="showWithdrawalConfirmModal('${request.id}', 'approved')" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                Tasdiqlash
              </button>
              <button onclick="showWithdrawalConfirmModal('${request.id}', 'rejected')" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                Rad etish
              </button>
            </div>
          </div>
        `
        withdrawalContainer.appendChild(requestElement)
      })
    }

    // Load payment history
    const paymentHistory = document.getElementById("paymentHistory")
    paymentHistory.innerHTML = ""

    paymentTransactions
      .slice(-20)
      .reverse()
      .forEach((transaction) => {
        const student = users.find((u) => u.id === transaction.studentId)
        const historyItem = document.createElement("div")
        historyItem.className = "flex justify-between items-center p-2 border rounded"
        historyItem.innerHTML = `
          <div>
            <span class="font-medium">${student?.name || "Noma'lum"}</span>
            <p class="text-sm text-gray-600">${transaction.description}</p>
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
            <p class="text-xs text-gray-500">${new Date(transaction.timestamp).toLocaleDateString("uz-UZ")}</p>
          </div>
        `
        paymentHistory.appendChild(historyItem)
      })
  } catch (error) {
    console.error("To'lovlarni yuklashda xatolik:", error)
  }
}

async function loadReferrals() {
  try {
    const referrals = await firebaseManager.getArrayData("referrals")

    // Load pending referrals
    const pendingReferrals = referrals.filter((r) => r.status === "pending")
    const pendingContainer = document.getElementById("pendingReferrals")
    pendingContainer.innerHTML = ""

    if (pendingReferrals.length === 0) {
      pendingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Kutilayotgan referallar yo\'q</p>'
    } else {
      pendingReferrals.forEach((referral) => {
        const referralElement = document.createElement("div")
        referralElement.className = "border rounded-lg p-4"
        referralElement.innerHTML = `
          <div class="flex flex-col gap-4">
            <div>
              <h4 class="font-semibold text-gray-900">${referral.referrerName}</h4>
              <p class="text-sm text-gray-600">Taklif qildi: <strong>${referral.newUserName}</strong></p>
              <p class="text-sm text-gray-600">Email: ${referral.newUserEmail}</p>
              <p class="text-sm text-gray-600">Referal kodi: <code class="bg-gray-100 px-2 py-1 rounded">${referral.referralCode}</code></p>
              <p class="text-xs text-gray-500">${new Date(referral.requestedAt).toLocaleString("uz-UZ")}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="approveReferralRequest('${referral.id}')" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                Tasdiqlash (20,000 coin)
              </button>
              <button onclick="rejectReferralRequest('${referral.id}')" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                Rad etish
              </button>
            </div>
          </div>
        `
        pendingContainer.appendChild(referralElement)
      })
    }

    // Load approved referrals
    const approvedReferrals = referrals.filter((r) => r.status === "approved")
    const approvedContainer = document.getElementById("approvedReferrals")
    approvedContainer.innerHTML = ""

    approvedReferrals
      .slice(-10)
      .reverse()
      .forEach((referral) => {
        const referralElement = document.createElement("div")
        referralElement.className = "flex justify-between items-center p-3 border rounded-lg bg-green-50"
        referralElement.innerHTML = `
        <div>
          <div class="font-medium">${referral.referrerName}</div>
          <div class="text-sm text-gray-600">→ ${referral.newUserName}</div>
          <div class="text-xs text-gray-500">${new Date(referral.approvedAt).toLocaleDateString("uz-UZ")}</div>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold text-green-600">+20,000 coin</div>
          <div class="text-xs text-green-600">Tasdiqlangan</div>
        </div>
      `
        approvedContainer.appendChild(referralElement)
      })
  } catch (error) {
    console.error("Referallarni yuklashda xatolik:", error)
  }
}

async function approveReferralRequest(referralId) {
  if (confirm("Bu referal so'rovini tasdiqlaysizmi? Refererga 20,000 coin beriladi.")) {
    try {
      await firebaseManager.approveReferral(referralId)
      alert("Referal so'rovi tasdiqlandi!")
      await loadReferrals()
      await loadStudents()
      await loadPayments()
    } catch (error) {
      console.error("Referalni tasdiqlashda xatolik:", error)
      alert("Referalni tasdiqlashda xatolik yuz berdi!")
    }
  }
}

async function rejectReferralRequest(referralId) {
  const reason = prompt("Rad etish sababini kiriting (ixtiyoriy):")
  if (reason !== null) {
    try {
      await firebaseManager.rejectReferral(referralId, reason)
      alert("Referal so'rovi rad etildi!")
      await loadReferrals()
    } catch (error) {
      console.error("Referalni rad etishda xatolik:", error)
      alert("Referalni rad etishda xatolik yuz berdi!")
    }
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

// Task management functions
function showCreateTaskModal() {
  loadStudentCheckboxes()
  document.getElementById("createTaskModal").classList.remove("hidden")
  document.getElementById("createTaskModal").classList.add("flex")
}

function closeCreateTaskModal() {
  document.getElementById("createTaskModal").classList.add("hidden")
  document.getElementById("createTaskModal").classList.remove("flex")
  document.getElementById("createTaskForm").reset()
}

async function loadStudentCheckboxes() {
  try {
    const users = await firebaseManager.getArrayData("users")
    const students = users.filter((u) => u.role === "student")

    const container = document.getElementById("studentCheckboxes")
    container.innerHTML = ""

    students.forEach((student) => {
      const checkbox = document.createElement("label")
      checkbox.className = "flex items-center space-x-2 p-1 cursor-pointer"
      checkbox.innerHTML = `
        <input type="checkbox" value="${student.id}" class="text-blue-600">
        <span class="text-sm">${student.name} (${student.email})</span>
      `
      container.appendChild(checkbox)
    })
  } catch (error) {
    console.error("O'quvchilar ro'yxatini yuklashda xatolik:", error)
  }
}

async function loadProjectStudentCheckboxes() {
  try {
    const users = await firebaseManager.getArrayData("users")
    const students = users.filter((u) => u.role === "student")

    const container = document.getElementById("projectStudentCheckboxes")
    container.innerHTML = ""

    students.forEach((student) => {
      const checkbox = document.createElement("label")
      checkbox.className = "flex items-center space-x-2 p-1 cursor-pointer"
      checkbox.innerHTML = `
        <input type="checkbox" value="${student.id}" class="text-blue-600">
        <span class="text-sm">${student.name} (${student.email})</span>
      `
      container.appendChild(checkbox)
    })
  } catch (error) {
    console.error("O'quvchilar ro'yxatini yuklashda xatolik:", error)
  }
}

document.getElementById("createTaskForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const title = document.getElementById("taskTitle").value
  const description = document.getElementById("taskDescription").value
  const deadline = Number.parseInt(document.getElementById("taskDeadline").value)

  const assignedTo = Array.from(document.querySelectorAll("#studentCheckboxes input:checked")).map((cb) => cb.value)

  if (assignedTo.length === 0) {
    alert("Kamida bitta o'quvchini tanlang!")
    return
  }

  try {
    const newTask = {
      title,
      description,
      deadline: new Date(Date.now() + deadline * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      status: "active",
    }

    await firebaseManager.addToArray("tasks", newTask)

    // Send notifications to assigned students
    await firebaseManager.sendNotification(assignedTo, {
      type: "task",
      title: "Yangi vazifa",
      message: `"${title}" vazifasi sizga tayinlandi`,
    })

    alert("Vazifa muvaffaqiyatli yaratildi!")
    closeCreateTaskModal()
    await loadAdminTasks()
  } catch (error) {
    console.error("Vazifa yaratishda xatolik:", error)
    alert("Vazifa yaratishda xatolik yuz berdi!")
  }
})

// Test management
function showCreateTestModal() {
  questionCount = 0
  document.getElementById("questionsContainer").innerHTML = ""
  document.getElementById("createTestModal").classList.remove("hidden")
  document.getElementById("createTestModal").classList.add("flex")

  // Add first question automatically
  addQuestion()
}

function closeCreateTestModal() {
  document.getElementById("createTestModal").classList.add("hidden")
  document.getElementById("createTestModal").classList.remove("flex")
  document.getElementById("createTestForm").reset()
  questionCount = 0
}

function addQuestion() {
  const questionsContainer = document.getElementById("questionsContainer")
  const questionIndex = questionsContainer.children.length

  const questionDiv = document.createElement("div")
  questionDiv.className = "border rounded-lg p-4 question-item"
  questionDiv.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h4 class="font-medium">Savol ${questionIndex + 1}</h4>
      <button type="button" onclick="removeQuestion(this)" class="text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="space-y-3">
      <input type="text" placeholder="Savol matni" class="w-full px-3 py-2 border rounded-md question-text" required>
      <div class="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Variant A" class="px-3 py-2 border rounded-md option-input" required>
        <input type="text" placeholder="Variant B" class="px-3 py-2 border rounded-md option-input" required>
        <input type="text" placeholder="Variant C" class="px-3 py-2 border rounded-md option-input" required>
        <input type="text" placeholder="Variant D" class="px-3 py-2 border rounded-md option-input" required>
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">To'g'ri javob:</label>
        <select class="w-full px-3 py-2 border rounded-md correct-answer" required>
          <option value="">Tanlang...</option>
          <option value="0">Variant A</option>
          <option value="1">Variant B</option>
          <option value="2">Variant C</option>
          <option value="3">Variant D</option>
        </select>
      </div>
    </div>
  `

  questionsContainer.appendChild(questionDiv)
  questionCount++
}

function removeQuestion(button) {
  const questionDiv = button.closest(".question-item")
  questionDiv.remove()
  questionCount--

  // Update question numbers
  const questions = document.querySelectorAll(".question-item")
  questions.forEach((question, index) => {
    const header = question.querySelector("h4")
    header.textContent = `Savol ${index + 1}`
  })
}

document.getElementById("createTestForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const title = document.getElementById("testTitle").value.trim()
  const description = document.getElementById("testDescription").value.trim()

  if (!title || !description) {
    alert("Test nomi va tavsifini kiriting!")
    return
  }

  const questions = []
  const questionItems = document.querySelectorAll("#questionsContainer .question-item")

  if (questionItems.length === 0) {
    alert("Kamida bitta savol qo'shing!")
    return
  }

  let hasError = false
  questionItems.forEach((questionDiv, index) => {
    const questionText = questionDiv.querySelector(".question-text").value.trim()
    const optionInputs = questionDiv.querySelectorAll(".option-input")
    const correctAnswerSelect = questionDiv.querySelector(".correct-answer")

    if (!questionText) {
      alert(`${index + 1}-savol matni bo'sh!`)
      hasError = true
      return
    }

    const options = []
    optionInputs.forEach((input) => {
      const value = input.value.trim()
      if (!value) {
        alert(`${index + 1}-savolda barcha variantlarni to'ldiring!`)
        hasError = true
        return
      }
      options.push(value)
    })

    const correctAnswer = correctAnswerSelect.value
    if (correctAnswer === "") {
      alert(`${index + 1}-savol uchun to'g'ri javobni tanlang!`)
      hasError = true
      return
    }

    if (!hasError) {
      questions.push({
        question: questionText,
        options: options,
        correctAnswer: Number.parseInt(correctAnswer),
      })
    }
  })

  if (hasError) return

  try {
    const newTest = {
      title,
      description,
      questions,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    }

    await firebaseManager.addToArray("tests", newTest)

    // Send notifications to all students
    const users = await firebaseManager.getArrayData("users")
    const studentIds = users.filter((u) => u.role === "student").map((u) => u.id)
    await firebaseManager.sendNotification(studentIds, {
      type: "test",
      title: "Yangi test",
      message: `"${title}" testi qo'shildi`,
    })

    alert("Test muvaffaqiyatli yaratildi!")
    closeCreateTestModal()
    await loadAdminTests()
  } catch (error) {
    console.error("Test yaratishda xatolik:", error)
    alert("Test yaratishda xatolik yuz berdi!")
  }
})

// Project management
function showCreateProjectModal() {
  loadProjectStudentCheckboxes()
  document.getElementById("createProjectModal").classList.remove("hidden")
  document.getElementById("createProjectModal").classList.add("flex")
}

function closeCreateProjectModal() {
  document.getElementById("createProjectModal").classList.add("hidden")
  document.getElementById("createProjectModal").classList.remove("flex")
  document.getElementById("createProjectForm").reset()
}

document.getElementById("createProjectForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const title = document.getElementById("projectTitle").value
  const description = document.getElementById("projectDescription").value
  const link = document.getElementById("projectLink").value
  const deadline = Number.parseInt(document.getElementById("projectDeadline").value)
  const payment = Number.parseInt(document.getElementById("projectPayment").value)

  const assignedTo = Array.from(document.querySelectorAll("#projectStudentCheckboxes input:checked")).map(
    (cb) => cb.value,
  )

  if (assignedTo.length === 0) {
    alert("Kamida bitta o'quvchini tanlang!")
    return
  }

  try {
    const newProject = {
      title,
      description,
      link,
      deadline: new Date(Date.now() + deadline * 24 * 60 * 60 * 1000).toISOString(),
      payment,
      assignedTo,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      status: "active",
    }

    await firebaseManager.addToArray("projects", newProject)

    // Send notifications to assigned students
    await firebaseManager.sendNotification(assignedTo, {
      type: "project",
      title: "Yangi loyiha",
      message: `"${title}" loyihasi sizga tayinlandi (${payment} coin)`,
    })

    alert("Loyiha muvaffaqiyatli yaratildi!")
    closeCreateProjectModal()
    await loadAdminProjects()
  } catch (error) {
    console.error("Loyiha yaratishda xatolik:", error)
    alert("Loyiha yaratishda xatolik yuz berdi!")
  }
})

// Attendance functions
async function markAttendance(studentId, status) {
  try {
    const selectedDate = document.getElementById("selectedDate").value
    if (!selectedDate) {
      alert("Iltimos, sanani tanlang!")
      return
    }

    // Check if attendance is locked for this date
    const lockedDates = (await firebaseManager.getData("lockedAttendanceDates")) || []
    if (lockedDates.includes(selectedDate)) {
      alert("Bu sanada davomat allaqachon tasdiqlangan va o'zgartirib bo'lmaydi!")
      return
    }

    const attendanceRecords = await firebaseManager.getArrayData("attendanceRecords")
    const users = await firebaseManager.getArrayData("users")

    const existingRecord = attendanceRecords.find((r) => r.studentId === studentId && r.date === selectedDate)

    let fineAmount = 0

    // Calculate fine based on status
    if (status === "absent") {
      fineAmount = 500 // 500 coin fine for absent
    } else if (status === "late") {
      fineAmount = 100 // 100 coin fine for late
    }

    if (existingRecord) {
      // Update existing record
      const updates = {
        status,
        fineAmount,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.id,
      }

      // If changing from a fine status to present, remove the fine
      if (existingRecord.fineAmount && status === "present") {
        const user = users.find((u) => u.id === studentId)
        if (user) {
          await firebaseManager.updateInArray("users", user.id, {
            rating: (user.rating || 0) + existingRecord.fineAmount,
          })

          // Record transaction for fine removal
          await firebaseManager.addToArray("paymentTransactions", {
            studentId,
            type: "earning",
            amount: existingRecord.fineAmount,
            description: `Jarima bekor qilindi: ${existingRecord.status === "absent" ? "Kelmadi" : "Kech keldi"}`,
            timestamp: new Date().toISOString(),
            relatedId: existingRecord.id,
          })
        }
      }

      await firebaseManager.updateInArray("attendanceRecords", existingRecord.id, updates)

      // Apply new fine if needed
      if (fineAmount > 0) {
        const user = users.find((u) => u.id === studentId)
        if (user) {
          await firebaseManager.updateInArray("users", user.id, {
            rating: (user.rating || 0) - fineAmount,
          })

          // Record transaction for new fine
          await firebaseManager.addToArray("paymentTransactions", {
            studentId,
            type: "fine",
            amount: fineAmount,
            description: `Davomat jarima: ${status === "absent" ? "Kelmadi" : "Kech keldi"}`,
            timestamp: new Date().toISOString(),
            relatedId: existingRecord.id,
          })
        }
      }
    } else {
      // Create new record
      const newRecord = {
        studentId,
        date: selectedDate,
        status,
        fineAmount,
        recordedBy: currentUser.id,
        recordedAt: new Date().toISOString(),
      }

      const recordId = await firebaseManager.addToArray("attendanceRecords", newRecord)

      if (fineAmount > 0) {
        // Apply fine to student rating
        const user = users.find((u) => u.id === studentId)
        if (user) {
          await firebaseManager.updateInArray("users", user.id, {
            rating: (user.rating || 0) - fineAmount,
          })

          // Record transaction
          await firebaseManager.addToArray("paymentTransactions", {
            studentId,
            type: "fine",
            amount: fineAmount,
            description: `Davomat jarima: ${status === "absent" ? "Kelmadi" : "Kech keldi"}`,
            timestamp: new Date().toISOString(),
            relatedId: recordId,
          })
        }
      }
    }

    // Show success message
    const student = users.find((u) => u.id === studentId)
    const statusText = status === "present" ? "Keldi" : status === "late" ? "Kech keldi" : "Kelmadi"
    alert(`${student?.name || "O'quvchi"} - ${statusText} deb belgilandi!`)

    await loadAttendance()
    await loadStudents()
  } catch (error) {
    console.error("Davomat belgilashda xatolik:", error)
    alert("Davomat belgilashda xatolik yuz berdi!")
  }
}

async function confirmAttendance() {
  const password = document.getElementById("attendancePassword").value

  if (password !== currentUser.password) {
    alert("Parol noto'g'ri!")
    return
  }

  try {
    const selectedDate = document.getElementById("selectedDate").value
    if (!selectedDate) {
      alert("Iltimos, sanani tanlang!")
      return
    }

    // Check if any attendance is recorded for this date
    const attendanceRecords = await firebaseManager.getArrayData("attendanceRecords")
    const dateRecords = attendanceRecords.filter((r) => r.date === selectedDate)

    if (dateRecords.length === 0) {
      alert("Bu sanada hech qanday davomat belgilanmagan!")
      return
    }

    // Lock attendance for the selected date
    const lockedDates = (await firebaseManager.getData("lockedAttendanceDates")) || []

    if (!lockedDates.includes(selectedDate)) {
      lockedDates.push(selectedDate)
      await firebaseManager.saveData("lockedAttendanceDates", lockedDates)
    }

    // Create confirmation record
    await firebaseManager.addToArray("attendanceConfirmations", {
      date: selectedDate,
      confirmedBy: currentUser.id,
      confirmedAt: new Date().toISOString(),
      recordsCount: dateRecords.length,
    })

    alert("Davomat tasdiqlandi va o'zgartirib bo'lmaydi!")
    closeAttendanceConfirmModal()
    await loadAttendance()
  } catch (error) {
    console.error("Davomatni tasdiqlashda xatolik:", error)
    alert("Davomatni tasdiqlashda xatolik yuz berdi!")
  }
}

async function markAttendanceForAll() {
  try {
    const selectedDate = document.getElementById("selectedDate").value
    if (!selectedDate) {
      alert("Iltimos, sanani tanlang!")
      return
    }

    // Check if attendance is locked for this date
    const lockedDates = (await firebaseManager.getData("lockedAttendanceDates")) || []
    if (lockedDates.includes(selectedDate)) {
      alert("Bu sanada davomat allaqachon tasdiqlangan!")
      return
    }

    if (!confirm("Barcha o'quvchilarni 'Keldi' deb belgilaysizmi?")) {
      return
    }

    const users = await firebaseManager.getArrayData("users")
    const students = users.filter((u) => u.role === "student")

    for (const student of students) {
      await markAttendance(student.id, "present")
    }

    alert("Barcha o'quvchilar 'Keldi' deb belgilandi!")
  } catch (error) {
    console.error("Barcha davomatni belgilashda xatolik:", error)
    alert("Barcha davomatni belgilashda xatolik yuz berdi!")
  }
}

function showAttendanceConfirmModal() {
  document.getElementById("attendanceConfirmModal").classList.remove("hidden")
  document.getElementById("attendanceConfirmModal").classList.add("flex")
}

function closeAttendanceConfirmModal() {
  document.getElementById("attendanceConfirmModal").classList.add("hidden")
  document.getElementById("attendanceConfirmModal").classList.remove("flex")
  document.getElementById("attendancePassword").value = ""
}

async function confirmAttendanceAction() {
  const password = document.getElementById("attendancePassword").value

  if (password !== currentUser.password) {
    alert("Parol noto'g'ri!")
    return
  }

  try {
    // Lock attendance for the selected date
    const selectedDate = document.getElementById("selectedDate").value
    const lockedDates = (await firebaseManager.getData("lockedAttendanceDates")) || []

    if (!lockedDates.includes(selectedDate)) {
      lockedDates.push(selectedDate)
      await firebaseManager.saveData("lockedAttendanceDates", lockedDates)
    }

    alert("Davomat tasdiqlandi va o'zgartirib bo'lmaydi!")
    closeAttendanceConfirmModal()
  } catch (error) {
    console.error("Davomatni tasdiqlashda xatolik:", error)
    alert("Davomatni tasdiqlashda xatolik yuz berdi!")
  }
}

// Fine management modal
function showFineModal(studentId) {
  firebaseManager
    .getArrayData("users")
    .then((users) => {
      const student = users.find((u) => u.id === studentId)

      if (!student) return

      const modal = document.createElement("div")
      modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      modal.innerHTML = `
      <div class="bg-white rounded-lg w-full max-w-md">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Jarima boshqaruvi</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold">${student.name}</h4>
              <p class="text-sm text-gray-600">${student.email}</p>
              <p class="text-sm ${(student.rating || 0) >= 0 ? "text-blue-600" : "text-red-600"}">Joriy balans: ${student.rating || 0} coin</p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Jarima miqdori (coin)</label>
              <input type="number" id="fineAmount" class="w-full px-3 py-2 border rounded-md" min="1" placeholder="Jarima miqdori">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Jarima sababi</label>
              <textarea id="fineReason" class="w-full px-3 py-2 border rounded-md h-20" placeholder="Jarima sababi..."></textarea>
            </div>
            <div class="flex justify-end space-x-2">
              <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50">Bekor qilish</button>
              <button onclick="applyFine('${studentId}'); this.closest('.fixed').remove()" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Jarima qo'llash</button>
            </div>
          </div>
        </div>
      </div>
    `
      document.body.appendChild(modal)
    })
    .catch((error) => {
      console.error("O'quvchi ma'lumotlarini olishda xatolik:", error)
    })
}

async function applyFine(studentId) {
  const fineAmount = Number.parseInt(document.getElementById("fineAmount").value)
  const fineReason = document.getElementById("fineReason").value.trim()

  if (!fineAmount || fineAmount <= 0) {
    alert("To'g'ri jarima miqdorini kiriting!")
    return
  }

  if (!fineReason) {
    alert("Jarima sababini kiriting!")
    return
  }

  try {
    const users = await firebaseManager.getArrayData("users")
    const user = users.find((u) => u.id === studentId)

    if (user) {
      await firebaseManager.updateInArray("users", user.id, {
        rating: (user.rating || 0) - fineAmount,
      })

      // Record transaction
      await firebaseManager.addToArray("paymentTransactions", {
        studentId,
        type: "fine",
        amount: fineAmount,
        description: `Admin jarima: ${fineReason}`,
        timestamp: new Date().toISOString(),
      })

      // Send notification
      await firebaseManager.sendNotification([studentId], {
        type: "payment",
        title: "Jarima qo'llandi",
        message: `${fineAmount} coin jarima: ${fineReason}`,
      })

      alert(`${fineAmount} coin jarima qo'llandi!`)
      await loadStudents()
      await loadPayments()
    }
  } catch (error) {
    console.error("Jarima qo'llashda xatolik:", error)
    alert("Jarima qo'llashda xatolik yuz berdi!")
  }
}

// Payment functions
function showWithdrawalConfirmModal(requestId, action) {
  currentWithdrawalRequest = { id: requestId, action }

  firebaseManager.getArrayData("withdrawalRequests").then((withdrawalRequests) => {
    const request = withdrawalRequests.find((r) => r.id === requestId)

    if (request) {
      document.getElementById("withdrawalDetails").innerHTML = `
        <h4 class="font-semibold">${request.studentName}</h4>
        <p>Miqdor: ${request.coins} coin (${request.amount.toLocaleString()} so'm)</p>
        <p>Karta: ${request.method} ${request.cardNumber}</p>
      `
    }

    document.getElementById("withdrawalConfirmModal").classList.remove("hidden")
    document.getElementById("withdrawalConfirmModal").classList.add("flex")
  })
}

function closeWithdrawalConfirmModal() {
  document.getElementById("withdrawalConfirmModal").classList.add("hidden")
  document.getElementById("withdrawalConfirmModal").classList.remove("flex")
  document.getElementById("withdrawalConfirmPassword").value = ""
  currentWithdrawalRequest = null
}

async function confirmWithdrawal() {
  const password = document.getElementById("withdrawalConfirmPassword").value

  if (password !== currentUser.password) {
    alert("Parol noto'g'ri!")
    return
  }

  if (currentWithdrawalRequest) {
    await processWithdrawal(currentWithdrawalRequest.id, currentWithdrawalRequest.action)
    closeWithdrawalConfirmModal()
  }
}

async function rejectWithdrawal() {
  const password = document.getElementById("withdrawalConfirmPassword").value

  if (password !== currentUser.password) {
    alert("Parol noto'g'ri!")
    return
  }

  if (currentWithdrawalRequest) {
    await processWithdrawal(currentWithdrawalRequest.id, "rejected")
    closeWithdrawalConfirmModal()
  }
}

async function processWithdrawal(requestId, status) {
  try {
    const withdrawalRequests = await firebaseManager.getArrayData("withdrawalRequests")
    const users = await firebaseManager.getArrayData("users")

    const request = withdrawalRequests.find((r) => r.id === requestId)
    if (!request) return

    const updates = {
      status,
      processedBy: currentUser.id,
      processedAt: new Date().toISOString(),
    }

    await firebaseManager.updateInArray("withdrawalRequests", requestId, updates)

    if (status === "approved") {
      // Record transaction
      await firebaseManager.addToArray("paymentTransactions", {
        studentId: request.studentId,
        type: "withdrawal",
        amount: request.coins,
        description: `Pul yechish: ${request.method} ${request.cardNumber}`,
        timestamp: new Date().toISOString(),
        relatedId: requestId,
      })

      // Send notification
      await firebaseManager.sendNotification([request.studentId], {
        type: "payment",
        title: "Pul yechish tasdiqlandi",
        message: `${request.coins} coin (${request.amount.toLocaleString()} so'm) kartangizga o'tkazildi`,
      })
    } else {
      // Return coins to balance if rejected
      const user = users.find((u) => u.id === request.studentId)
      if (user) {
        await firebaseManager.updateInArray("users", user.id, {
          rating: (user.rating || 0) + request.coins,
        })
      }

      // Send notification
      await firebaseManager.sendNotification([request.studentId], {
        type: "payment",
        title: "Pul yechish rad etildi",
        message: `${request.coins} coin hisobingizga qaytarildi`,
      })
    }

    alert(`So'rov ${status === "approved" ? "tasdiqlandi" : "rad etildi"}!`)
    await loadPayments()
    await loadStudents()
  } catch (error) {
    console.error("Pul yechish so'rovini qayta ishlashda xatolik:", error)
    alert("Pul yechish so'rovini qayta ishlashda xatolik yuz berdi!")
  }
}

// View functions
async function viewTaskSubmissions(taskId) {
  try {
    const submissions = await firebaseManager.getArrayData("submissions")
    const taskSubmissions = submissions.filter((s) => s.taskId === taskId)

    if (taskSubmissions.length === 0) {
      alert("Bu vazifa uchun hozircha topshiriqlar yo'q")
      return
    }

    let submissionsHtml = '<div class="space-y-4">'
    taskSubmissions.forEach((submission) => {
      submissionsHtml += `
        <div class="border rounded-lg p-4">
          <div class="flex flex-col sm:flex-row justify-between items-start mb-3 gap-4">
            <div>
              <h4 class="font-semibold">${submission.studentName}</h4>
              <p class="text-sm text-gray-600">Topshirilgan: ${new Date(submission.submittedAt).toLocaleString("uz-UZ")}</p>
              <span class="px-2 py-1 rounded-full text-xs ${
                submission.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : submission.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }">
                ${
                  submission.status === "approved"
                    ? "Tasdiqlangan"
                    : submission.status === "rejected"
                      ? "Rad etilgan"
                      : "Kutilmoqda"
                }
              </span>
            </div>
            ${
              submission.status === "pending"
                ? `
              <div class="flex flex-wrap gap-2">
                <input type="number" id="points_${submission.id}" placeholder="Ball" min="1" max="100" class="w-20 px-2 py-1 border rounded text-sm">
                <button onclick="reviewSubmission('${submission.id}', 'approved', document.getElementById('points_${submission.id}').value); this.closest('.fixed').remove()" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  Tasdiqlash
                </button>
                <button onclick="reviewSubmission('${submission.id}', 'rejected', 0, prompt('Rad etish sababi:')); this.closest('.fixed').remove()" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                  Rad etish
                </button>
              </div>
            `
                : ""
            }
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h5 class="font-medium mb-1">HTML:</h5>
              <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">${submission.htmlCode || "Yo'q"}</pre>
            </div>
            <div>
              <h5 class="font-medium mb-1">CSS:</h5>
              <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">${submission.cssCode || "Yo'q"}</pre>
            </div>
            <div>
              <h5 class="font-medium mb-1">JavaScript:</h5>
              <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">${submission.jsCode || "Yo'q"}</pre>
            </div>
          </div>
          ${
            submission.feedback
              ? `
            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h5 class="font-medium text-yellow-800">Izoh:</h5>
              <p class="text-yellow-700">${submission.feedback}</p>
            </div>
          `
              : ""
          }
        </div>
      `
    })
    submissionsHtml += "</div>"

    const modal = document.createElement("div")
    modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    modal.innerHTML = `
      <div class="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-xl font-bold">Vazifa Topshiriqlari</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6">
          ${submissionsHtml}
        </div>
      </div>
    `
    document.body.appendChild(modal)
  } catch (error) {
    console.error("Vazifa topshiriqlarini ko'rishda xatolik:", error)
    alert("Vazifa topshiriqlarini ko'rishda xatolik yuz berdi!")
  }
}

async function viewTestResults(testId) {
  try {
    const testResults = await firebaseManager.getArrayData("testResults")
    const results = testResults.filter((r) => r.testId === testId)

    if (results.length === 0) {
      alert("Bu test uchun hozircha natijalar yo'q")
      return
    }

    let resultsHtml = '<div class="space-y-2">'
    results.forEach((result) => {
      const percentage = Math.round((result.score / result.totalQuestions) * 100)
      resultsHtml += `
        <div class="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div class="font-medium">${result.studentName}</div>
            <div class="text-sm text-gray-600">${new Date(result.completedAt).toLocaleString("uz-UZ")}</div>
          </div>
          <div class="text-right">
            <div class="font-bold ${percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600"}">
              ${result.score}/${result.totalQuestions}
            </div>
            <div class="text-sm text-gray-600">${percentage}%</div>
          </div>
        </div>
      `
    })
    resultsHtml += "</div>"

    const modal = document.createElement("div")
    modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    modal.innerHTML = `
      <div class="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-xl font-bold">Test Natijalari</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6">
          ${resultsHtml}
        </div>
      </div>
    `
    document.body.appendChild(modal)
  } catch (error) {
    console.error("Test natijalarini ko'rishda xatolik:", error)
    alert("Test natijalarini ko'rishda xatolik yuz berdi!")
  }
}

async function viewProjectSubmissions(projectId) {
  try {
    const projectSubmissions = await firebaseManager.getArrayData("projectSubmissions")
    const submissions = projectSubmissions.filter((s) => s.projectId === projectId)

    if (submissions.length === 0) {
      alert("Bu loyiha uchun hozircha topshiriqlar yo'q")
      return
    }

    let submissionsHtml = '<div class="space-y-4">'
    submissions.forEach((submission) => {
      submissionsHtml += `
        <div class="border rounded-lg p-4">
          <div class="flex flex-col sm:flex-row justify-between items-start mb-3 gap-4">
            <div>
              <h4 class="font-semibold">${submission.studentName}</h4>
              <p class="text-sm text-gray-600">Topshirilgan: ${new Date(submission.submittedAt).toLocaleString("uz-UZ")}</p>
              <p class="text-sm text-blue-600">URL: <a href="${submission.websiteUrl}" target="_blank" class="hover:underline">${submission.websiteUrl}</a></p>
              <span class="px-2 py-1 rounded-full text-xs ${
                submission.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : submission.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }">
                ${
                  submission.status === "approved"
                    ? "Tasdiqlangan"
                    : submission.status === "rejected"
                      ? "Rad etilgan"
                      : "Kutilmoqda"
                }
              </span>
            </div>
            ${
              submission.status === "pending"
                ? `
              <div class="flex flex-wrap gap-2">
                <button onclick="approveProjectSubmission('${submission.id}'); this.closest('.fixed').remove()" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  Tasdiqlash
                </button>
                <button onclick="rejectProjectSubmission('${submission.id}', prompt('Rad etish sababi:')); this.closest('.fixed').remove()" class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                  Rad etish
                </button>
              </div>
            `
                : ""
            }
          </div>
          ${
            submission.feedback
              ? `
            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h5 class="font-medium text-yellow-800">Izoh:</h5>
              <p class="text-yellow-700">${submission.feedback}</p>
            </div>
          `
              : ""
          }
        </div>
      `
    })
    submissionsHtml += "</div>"

    const modal = document.createElement("div")
    modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    modal.innerHTML = `
      <div class="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-xl font-bold">Loyiha Topshiriqlari</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6">
          ${submissionsHtml}
        </div>
      </div>
    `
    document.body.appendChild(modal)
  } catch (error) {
    console.error("Loyiha topshiriqlarini ko'rishda xatolik:", error)
    alert("Loyiha topshiriqlarini ko'rishda xatolik yuz berdi!")
  }
}

async function reviewSubmission(submissionId, status, points = 0, feedback = "") {
  try {
    const submissions = await firebaseManager.getArrayData("submissions")
    const submission = submissions.find((s) => s.id === submissionId)

    if (!submission) return

    const updates = {
      status,
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString(),
    }

    if (feedback) {
      updates.feedback = feedback
    }

    await firebaseManager.updateInArray("submissions", submissionId, updates)

    // Update student rating if approved
    if (status === "approved" && points > 0) {
      const users = await firebaseManager.getArrayData("users")
      const user = users.find((u) => u.id === submission.studentId)
      if (user) {
        await firebaseManager.updateInArray("users", user.id, {
          rating: (user.rating || 0) + Number.parseInt(points),
        })

        // Record transaction
        await firebaseManager.addToArray("paymentTransactions", {
          studentId: submission.studentId,
          type: "earning",
          amount: Number.parseInt(points),
          description: `Vazifa bajarildi`,
          timestamp: new Date().toISOString(),
          relatedId: submissionId,
        })

        // Send notification
        await firebaseManager.sendNotification([submission.studentId], {
          type: "task",
          title: status === "approved" ? "Vazifa tasdiqlandi" : "Vazifa rad etildi",
          message: status === "approved" ? `${points} coin olasiz` : feedback || "Vazifa rad etildi",
        })
      }
    }

    alert(`Vazifa ${status === "approved" ? "tasdiqlandi" : "rad etildi"}!`)
    await loadAdminTasks()
    await loadStudents()
  } catch (error) {
    console.error("Vazifa topshiriqni ko'rib chiqishda xatolik:", error)
    alert("Vazifa topshiriqni ko'rib chiqishda xatolik yuz berdi!")
  }
}

async function approveProjectSubmission(submissionId) {
  try {
    const projectSubmissions = await firebaseManager.getArrayData("projectSubmissions")
    const projects = await firebaseManager.getArrayData("projects")
    const users = await firebaseManager.getArrayData("users")

    const submission = projectSubmissions.find((s) => s.id === submissionId)
    if (!submission) return

    const project = projects.find((p) => p.id === submission.projectId)
    if (!project) return

    // Update submission status
    await firebaseManager.updateInArray("projectSubmissions", submissionId, {
      status: "approved",
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString(),
    })

    // Add payment to student rating
    const user = users.find((u) => u.id === submission.studentId)
    if (user) {
      await firebaseManager.updateInArray("users", user.id, {
        rating: (user.rating || 0) + project.payment,
      })

      // Record transaction
      await firebaseManager.addToArray("paymentTransactions", {
        studentId: submission.studentId,
        type: "earning",
        amount: project.payment,
        description: `Loyiha to'lovi: ${project.title}`,
        timestamp: new Date().toISOString(),
        relatedId: submissionId,
      })

      // Send notification
      await firebaseManager.sendNotification([submission.studentId], {
        type: "project",
        title: "Loyiha tasdiqlandi",
        message: `${project.payment} coin olasiz`,
      })
    }

    alert(`Loyiha tasdiqlandi! ${project.payment} coin to'landi.`)
    await loadAdminProjects()
    await loadStudents()
    await loadPayments()
  } catch (error) {
    console.error("Loyiha topshiriqni tasdiqlashda xatolik:", error)
    alert("Loyiha topshiriqni tasdiqlashda xatolik yuz berdi!")
  }
}

async function rejectProjectSubmission(submissionId, feedback = "") {
  try {
    const projectSubmissions = await firebaseManager.getArrayData("projectSubmissions")
    const submission = projectSubmissions.find((s) => s.id === submissionId)

    if (!submission) return

    await firebaseManager.updateInArray("projectSubmissions", submissionId, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString(),
      feedback,
    })

    // Send notification
    await firebaseManager.sendNotification([submission.studentId], {
      type: "project",
      title: "Loyiha rad etildi",
      message: feedback || "Loyiha rad etildi",
    })

    alert("Loyiha rad etildi!")
    await loadAdminProjects()
  } catch (error) {
    console.error("Loyiha topshiriqni rad etishda xatolik:", error)
    alert("Loyiha topshiriqni rad etishda xatolik yuz berdi!")
  }
}

// Delete functions
async function removeStudent(studentId) {
  if (confirm("Bu o'quvchini tizimdan o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.removeFromArray("users", studentId)
      await loadStudents()
    } catch (error) {
      console.error("O'quvchini o'chirishda xatolik:", error)
      alert("O'quvchini o'chirishda xatolik yuz berdi!")
    }
  }
}

async function deleteTask(taskId) {
  if (confirm("Bu vazifani o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.removeFromArray("tasks", taskId)
      await loadAdminTasks()
    } catch (error) {
      console.error("Vazifani o'chirishda xatolik:", error)
      alert("Vazifani o'chirishda xatolik yuz berdi!")
    }
  }
}

async function deleteTest(testId) {
  if (confirm("Bu testni o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.removeFromArray("tests", testId)
      await loadAdminTests()
    } catch (error) {
      console.error("Testni o'chirishda xatolik:", error)
      alert("Testni o'chirishda xatolik yuz berdi!")
    }
  }
}

async function deleteProject(projectId) {
  if (confirm("Bu loyihani o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.removeFromArray("projects", projectId)
      await loadAdminProjects()
    } catch (error) {
      console.error("Loyihani o'chirishda xatolik:", error)
      alert("Loyihani o'chirishda xatolik yuz berdi!")
    }
  }
}

// Clear functions
async function clearAllTasks() {
  if (confirm("Barcha vazifalarni o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.saveData("tasks", {})
      await firebaseManager.saveData("submissions", {})
      await loadAdminTasks()
      alert("Barcha vazifalar tozalandi!")
    } catch (error) {
      console.error("Vazifalarni tozalashda xatolik:", error)
      alert("Vazifalarni tozalashda xatolik yuz berdi!")
    }
  }
}

async function clearAllTests() {
  if (confirm("Barcha testlarni o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.saveData("tests", {})
      await firebaseManager.saveData("testResults", {})
      await loadAdminTests()
      await loadResults()
      alert("Barcha testlar tozalandi!")
    } catch (error) {
      console.error("Testlarni tozalashda xatolik:", error)
      alert("Testlarni tozalashda xatolik yuz berdi!")
    }
  }
}

async function clearAllProjects() {
  if (confirm("Barcha loyihalarni o'chirishni tasdiqlaysizmi?")) {
    try {
      await firebaseManager.saveData("projects", {})
      await firebaseManager.saveData("projectSubmissions", {})
      await loadAdminProjects()
      alert("Barcha loyihalar tozalandi!")
    } catch (error) {
      console.error("Loyihalarni tozalashda xatolik:", error)
      alert("Loyihalarni tozalashda xatolik yuz berdi!")
    }
  }
}

async function exportDatabase() {
  try {
    const data = await firebaseManager.exportDatabase()

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `freelancer_database_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    alert("Ma'lumotlar bazasi eksport qilindi!")
  } catch (error) {
    console.error("Ma'lumotlar bazasini eksport qilishda xatolik:", error)
    alert("Ma'lumotlar bazasini eksport qilishda xatolik yuz berdi!")
  }
}

function logout() {
  sessionStorage.removeItem("currentUser")
  window.location.href = "index.html"
}

// Date change handler for attendance
document.addEventListener("change", (e) => {
  if (e.target.id === "selectedDate") {
    loadAttendance()
  }
})

// Make functions global for onclick handlers
window.showTab = showTab
window.showCreateTaskModal = showCreateTaskModal
window.closeCreateTaskModal = closeCreateTaskModal
window.showCreateTestModal = showCreateTestModal
window.closeCreateTestModal = closeCreateTestModal
window.addQuestion = addQuestion
window.removeQuestion = removeQuestion
window.showCreateProjectModal = showCreateProjectModal
window.closeCreateProjectModal = closeCreateProjectModal
window.markAttendance = markAttendance
window.markAttendanceForAll = markAttendanceForAll
window.showAttendanceConfirmModal = showAttendanceConfirmModal
window.closeAttendanceConfirmModal = closeAttendanceConfirmModal
window.confirmAttendanceAction = confirmAttendanceAction
window.showFineModal = showFineModal
window.applyFine = applyFine
window.showWithdrawalConfirmModal = showWithdrawalConfirmModal
window.closeWithdrawalConfirmModal = closeWithdrawalConfirmModal
window.confirmWithdrawal = confirmWithdrawal
window.rejectWithdrawal = rejectWithdrawal
window.viewTaskSubmissions = viewTaskSubmissions
window.viewTestResults = viewTestResults
window.viewProjectSubmissions = viewProjectSubmissions
window.reviewSubmission = reviewSubmission
window.approveProjectSubmission = approveProjectSubmission
window.rejectProjectSubmission = rejectProjectSubmission
window.removeStudent = removeStudent
window.deleteTask = deleteTask
window.deleteTest = deleteTest
window.deleteProject = deleteProject
window.clearAllTasks = clearAllTasks
window.clearAllTests = clearAllTests
window.clearAllProjects = clearAllProjects
window.exportDatabase = exportDatabase
window.logout = logout
window.sendMessage = sendMessage
window.approveReferralRequest = approveReferralRequest
window.rejectReferralRequest = rejectReferralRequest
