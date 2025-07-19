import { firebaseManager } from "./firebase.js"

// Global variables
let currentUser = null
let allStudents = []
let allGroups = []
let allTasks = []
let allTests = []
let allProjects = []

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async function () {
  // Check authentication
  const userData = sessionStorage.getItem("currentUser")
  if (!userData) {
    window.location.href = "index.html"
    return
  }

  currentUser = JSON.parse(userData)
  if (currentUser.role !== "admin") {
    alert("Bu sahifaga faqat adminlar kirishi mumkin!")
    window.location.href = "index.html"
    return
  }

  // Initialize menu
  initializeMenu()

  // Load initial data
  await loadDashboardData()

  // Show dashboard by default
  showSection("dashboard")
})

// Menu initialization
function initializeMenu() {
  const menuItems = document.querySelectorAll(".menu-item[data-section]")
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()
      const section = item.getAttribute("data-section")
      showSection(section)
    })
  })
}

// Show section
function showSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll(".section")
  sections.forEach((section) => section.classList.add("hidden"))

  // Show selected section
  const targetSection = document.getElementById(`${sectionName}-section`)
  if (targetSection) {
    targetSection.classList.remove("hidden")
  }

  // Update menu active state
  const menuItems = document.querySelectorAll(".menu-item")
  menuItems.forEach((item) => item.classList.remove("active"))

  const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`)
  if (activeMenuItem) {
    activeMenuItem.classList.add("active")
  }

  // Load section data
  loadSectionData(sectionName)
}

// Load section data
async function loadSectionData(sectionName) {
  try {
    switch (sectionName) {
      case "dashboard":
        await loadDashboardData()
        break
      case "students":
        await loadStudents()
        break
      case "groups":
        await loadGroups()
        break
      case "tasks":
        await loadTasks()
        break
      case "tests":
        await loadTests()
        break
      case "projects":
        await loadProjects()
        break
      case "attendance":
        await loadAttendance()
        break
      case "payments":
        await loadPayments()
        break
      case "referrals":
        await loadReferrals()
        break
    }
  } catch (error) {
    console.error(`Error loading ${sectionName} data:`, error)
    showNotification(`${sectionName} ma'lumotlarini yuklashda xatolik`, "error")
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const stats = await firebaseManager.getStatistics()
    displayStatistics(stats)
    await loadRecentActivity()
  } catch (error) {
    console.error("Dashboard ma'lumotlarini yuklashda xatolik:", error)
  }
}

// Display statistics
function displayStatistics(stats) {
  const container = document.getElementById("statisticsContainer")
  container.innerHTML = `
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
          <i class="fas fa-users text-xl"></i>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Jami o'quvchilar</p>
          <p class="text-2xl font-semibold text-gray-900">${stats.general.totalStudents}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-green-100 text-green-600">
          <i class="fas fa-tasks text-xl"></i>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Jami vazifalar</p>
          <p class="text-2xl font-semibold text-gray-900">${stats.general.totalTasks}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
          <i class="fas fa-clipboard-check text-xl"></i>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Jami testlar</p>
          <p class="text-2xl font-semibold text-gray-900">${stats.general.totalTests}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
          <i class="fas fa-credit-card text-xl"></i>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">To'lov foizi</p>
          <p class="text-2xl font-semibold text-gray-900">${stats.payments.paymentRate}%</p>
        </div>
      </div>
    </div>
  `
}

// Load recent activity
async function loadRecentActivity() {
  try {
    const activities = await firebaseManager.getArrayData("userActivity")
    const recentActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)

    const container = document.getElementById("recentActivity")
    if (recentActivities.length === 0) {
      container.innerHTML = '<p class="text-gray-500">Hozircha faoliyat yo\'q</p>'
      return
    }

    container.innerHTML = recentActivities
      .map(
        (activity) => `
      <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded">
        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-blue-600 text-xs"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${activity.description}</p>
          <p class="text-xs text-gray-500">${formatDate(activity.timestamp)}</p>
        </div>
      </div>
    `,
      )
      .join("")
  } catch (error) {
    console.error("Recent activity yuklashda xatolik:", error)
  }
}

// Load students
async function loadStudents() {
  try {
    allStudents = await firebaseManager.getArrayData("users")
    allStudents = allStudents.filter((user) => user.role === "student")
    displayStudents(allStudents)
  } catch (error) {
    console.error("O'quvchilarni yuklashda xatolik:", error)
  }
}

// Display students
function displayStudents(students) {
  const container = document.getElementById("studentsContainer")
  
  if (students.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha o\'quvchilar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O'quvchi</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To'lov holati</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guruh</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${students
            .map(
              (student) => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold">${student.name.charAt(0)}</span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">${student.name}</div>
                    <div class="text-sm text-gray-500">${student.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">${(student.rating || 0).toLocaleString()}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  student.paymentStatus === "paid"
                    ? "bg-green-100 text-green-800"
                    : student.paymentStatus === "partial"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }">
                  ${
                    student.paymentStatus === "paid"
                      ? "To'langan"
                      : student.paymentStatus === "partial"
                      ? "Qisman"
                      : "To'lanmagan"
                  }
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${student.groupId ? getGroupName(student.groupId) : "Guruhsiz"}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showStudentActions('${student.id}')" class="text-blue-600 hover:text-blue-900">
                  <i class="fas fa-cog"></i>
                </button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
}

// Get group name
function getGroupName(groupId) {
  const group = allGroups.find((g) => g.id === groupId)
  return group ? group.name : "Noma'lum guruh"
}

// Show student actions modal
function showStudentActions(studentId) {
  const student = allStudents.find((s) => s.id === studentId)
  if (!student) return

  showModal("O'quvchi boshqaruvi", `
    <div class="space-y-4">
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-blue-600 font-bold text-xl">${student.name.charAt(0)}</span>
        </div>
        <h3 class="text-lg font-semibold">${student.name}</h3>
        <p class="text-gray-500">${student.email}</p>
        <p class="text-sm text-gray-600">Coin: ${(student.rating || 0).toLocaleString()}</p>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <button onclick="showAdjustCoinsModal('${studentId}')" class="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          <i class="fas fa-coins mr-2"></i>Coin boshqarish
        </button>
        <button onclick="showEditStudentModal('${studentId}')" class="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
          <i class="fas fa-edit mr-2"></i>Tahrirlash
        </button>
        <button onclick="showStudentHistory('${studentId}')" class="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600">
          <i class="fas fa-history mr-2"></i>Tarix
        </button>
        <button onclick="showStudentStats('${studentId}')" class="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600">
          <i class="fas fa-chart-bar mr-2"></i>Statistika
        </button>
      </div>
    </div>
  `)
}

// Show adjust coins modal
function showAdjustCoinsModal(studentId) {
  const student = allStudents.find((s) => s.id === studentId)
  if (!student) return

  showModal("Coin boshqarish", `
    <form onsubmit="adjustCoins(event, '${studentId}')">
      <div class="space-y-4">
        <div class="text-center">
          <h3 class="text-lg font-semibold">${student.name}</h3>
          <p class="text-gray-600">Joriy coin: ${(student.rating || 0).toLocaleString()}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Miqdor</label>
          <input type="number" id="coinAmount" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
          <p class="text-xs text-gray-500 mt-1">Musbat son qo'shish, manfiy son ayirish uchun</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Sabab</label>
          <textarea id="coinReason" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" required></textarea>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Saqlash
          </button>
        </div>
      </div>
    </form>
  `)
}

// Adjust coins
async function adjustCoins(event, studentId) {
  event.preventDefault()
  
  try {
    const amount = parseInt(document.getElementById("coinAmount").value)
    const reason = document.getElementById("coinReason").value.trim()
    
    if (!reason) {
      alert("Sabab kiritish majburiy!")
      return
    }
    
    await firebaseManager.adjustCoins(studentId, amount, reason)
    showNotification("Coin muvaffaqiyatli o'zgartirildi", "success")
    closeModal()
    await loadStudents()
  } catch (error) {
    console.error("Coin o'zgartirishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load tasks
async function loadTasks() {
  try {
    allTasks = await firebaseManager.getArrayData("tasks")
    displayTasks(allTasks)
  } catch (error) {
    console.error("Vazifalarni yuklashda xatolik:", error)
  }
}

// Display tasks
function displayTasks(tasks) {
  const container = document.getElementById("tasksContainer")
  
  if (tasks.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha vazifalar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${tasks
        .map(
          (task) => `
        <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-800">${task.title}</h3>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              task.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }">
              ${task.status === "active" ? "Faol" : "Nofaol"}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4">${task.description}</p>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Mukofot:</span>
              <span class="font-medium">${task.reward} coin</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Muddat:</span>
              <span class="font-medium">${formatDate(task.deadline)}</span>
            </div>
            ${task.groupId ? `
            <div class="flex justify-between">
              <span class="text-gray-500">Guruh:</span>
              <span class="font-medium">${getGroupName(task.groupId)}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button onclick="showTaskSubmissions('${task.id}')" class="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600">
              <i class="fas fa-eye mr-1"></i>Topshiriqlar
            </button>
            <button onclick="editTask('${task.id}')" class="bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
}

// Show create task modal
function showCreateTaskModal() {
  showModal("Yangi vazifa yaratish", `
    <form onsubmit="createTask(event)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Vazifa nomi *</label>
          <input type="text" id="taskTitle" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tavsif *</label>
          <textarea id="taskDescription" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4" required></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Muddat *</label>
          <input type="datetime-local" id="taskDeadline" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Mukofot (coin)</label>
          <input type="number" id="taskReward" value="50" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Website havolasi (ixtiyoriy)</label>
          <input type="url" id="taskWebsite" placeholder="https://example.com" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kimga berish</label>
          <select id="taskAssignType" onchange="toggleTaskAssignOptions()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Barcha o'quvchilarga</option>
            <option value="group">Guruhga</option>
            <option value="individual">Alohida o'quvchilarga</option>
          </select>
        </div>
        
        <div id="taskGroupSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">Guruh tanlang</label>
          <select id="taskGroup" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Guruh tanlang</option>
            ${allGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
          </select>
        </div>
        
        <div id="taskStudentSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">O'quvchilar tanlang</label>
          <div class="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            ${allStudents.map(student => `
              <label class="flex items-center space-x-2 p-1">
                <input type="checkbox" name="taskStudents" value="${student.id}" class="rounded">
                <span class="text-sm">${student.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Yaratish
          </button>
        </div>
      </div>
    </form>
  `)
}

// Toggle task assign options
function toggleTaskAssignOptions() {
  const assignType = document.getElementById("taskAssignType").value
  const groupSelect = document.getElementById("taskGroupSelect")
  const studentSelect = document.getElementById("taskStudentSelect")
  
  groupSelect.classList.add("hidden")
  studentSelect.classList.add("hidden")
  
  if (assignType === "group") {
    groupSelect.classList.remove("hidden")
  } else if (assignType === "individual") {
    studentSelect.classList.remove("hidden")
  }
}

// Create task
async function createTask(event) {
  event.preventDefault()
  
  try {
    const title = document.getElementById("taskTitle").value.trim()
    const description = document.getElementById("taskDescription").value.trim()
    const deadline = document.getElementById("taskDeadline").value
    const reward = parseInt(document.getElementById("taskReward").value) || 50
    const websiteUrl = document.getElementById("taskWebsite").value.trim() || null
    const assignType = document.getElementById("taskAssignType").value
    
    let groupId = null
    let assignedStudents = null
    
    if (assignType === "group") {
      groupId = document.getElementById("taskGroup").value || null
    } else if (assignType === "individual") {
      const selectedStudents = Array.from(document.querySelectorAll('input[name="taskStudents"]:checked'))
        .map(cb => cb.value)
      assignedStudents = selectedStudents.length > 0 ? selectedStudents : null
    }
    
    await firebaseManager.createTask(title, description, deadline, reward, groupId, websiteUrl, assignedStudents)
    showNotification("Vazifa muvaffaqiyatli yaratildi", "success")
    closeModal()
    await loadTasks()
  } catch (error) {
    console.error("Vazifa yaratishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Show task submissions
async function showTaskSubmissions(taskId) {
  try {
    const task = allTasks.find(t => t.id === taskId)
    const submissions = await firebaseManager.getArrayData("submissions")
    const taskSubmissions = submissions.filter(s => s.taskId === taskId)
    
    showModal(`"${task.title}" topshiriqlari`, `
      <div class="space-y-4">
        ${taskSubmissions.length === 0 ? 
          '<p class="text-gray-500 text-center">Hozircha topshiriqlar yo\'q</p>' :
          taskSubmissions.map(submission => {
            const student = allStudents.find(s => s.id === submission.studentId)
            return `
              <div class="border rounded-lg p-4 ${submission.status === 'pending' ? 'bg-yellow-50' : submission.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-semibold">${student ? student.name : 'Noma\'lum'}</h4>
                    <p class="text-sm text-gray-500">${formatDate(submission.submittedAt)}</p>
                  </div>
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }">
                    ${submission.status === 'pending' ? 'Kutilmoqda' : submission.status === 'approved' ? 'Qabul qilindi' : 'Rad etildi'}
                  </span>
                </div>
                
                <div class="mb-3">
                  <p class="text-sm text-gray-700">${submission.description || 'Tavsif yo\'q'}</p>
                </div>
                
                ${submission.status === 'pending' ? `
                  <div class="flex space-x-2">
                    <button onclick="showGradeSubmissionModal('${submission.id}', '${task.reward}')" class="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600">
                      Baholash
                    </button>
                  </div>
                ` : submission.feedback ? `
                  <div class="mt-2 p-2 bg-gray-100 rounded">
                    <p class="text-sm text-gray-600">Izoh: ${submission.feedback}</p>
                    ${submission.reward ? `<p class="text-sm font-medium">Berilgan coin: ${submission.reward}</p>` : ''}
                  </div>
                ` : ''}
              </div>
            `
          }).join('')
        }
      </div>
    `)
  } catch (error) {
    console.error("Topshiriqlarni yuklashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Show grade submission modal
function showGradeSubmissionModal(submissionId, defaultReward) {
  showModal("Topshiriqni baholash", `
    <form onsubmit="gradeSubmission(event, '${submissionId}')">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Coin miqdori</label>
          <input type="number" id="submissionReward" value="${defaultReward}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
          <p class="text-xs text-gray-500 mt-1">0 coin = rad etish</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Izoh (ixtiyoriy)</label>
          <textarea id="submissionFeedback" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Izoh yozing..."></textarea>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
            Baholash
          </button>
        </div>
      </div>
    </form>
  `)
}

// Grade submission
async function gradeSubmission(event, submissionId) {
  event.preventDefault()
  
  try {
    const reward = parseInt(document.getElementById("submissionReward").value)
    const feedback = document.getElementById("submissionFeedback").value.trim()
    
    await firebaseManager.gradeSubmission(submissionId, reward, feedback)
    showNotification("Topshiriq muvaffaqiyatli baholandi", "success")
    closeModal()
    // Refresh the submissions modal
    const currentModal = document.querySelector('.modal-content')
    if (currentModal) {
      const taskId = currentModal.getAttribute('data-task-id')
      if (taskId) {
        await showTaskSubmissions(taskId)
      }
    }
  } catch (error) {
    console.error("Topshiriqni baholashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load projects
async function loadProjects() {
  try {
    allProjects = await firebaseManager.getArrayData("projects")
    displayProjects(allProjects)
  } catch (error) {
    console.error("Loyihalarni yuklashda xatolik:", error)
  }
}

// Display projects
function displayProjects(projects) {
  const container = document.getElementById("projectsContainer")
  
  if (projects.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha loyihalar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${projects
        .map(
          (project) => `
        <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-800">${project.title}</h3>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              project.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }">
              ${project.status === "active" ? "Faol" : "Nofaol"}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4">${project.description}</p>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">To'lov:</span>
              <span class="font-medium">${project.payment} coin</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Muddat:</span>
              <span class="font-medium">${formatDate(project.deadline)}</span>
            </div>
            ${project.groupId ? `
            <div class="flex justify-between">
              <span class="text-gray-500">Guruh:</span>
              <span class="font-medium">${getGroupName(project.groupId)}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button onclick="showProjectSubmissions('${project.id}')" class="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600">
              <i class="fas fa-eye mr-1"></i>Topshiriqlar
            </button>
            <button onclick="editProject('${project.id}')" class="bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
}

// Show create project modal
function showCreateProjectModal() {
  showModal("Yangi loyiha yaratish", `
    <form onsubmit="createProject(event)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Loyiha nomi *</label>
          <input type="text" id="projectTitle" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tavsif *</label>
          <textarea id="projectDescription" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4" required></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Muddat *</label>
          <input type="datetime-local" id="projectDeadline" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">To'lov (coin)</label>
          <input type="number" id="projectPayment" value="1000" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Website havolasi (ixtiyoriy)</label>
          <input type="url" id="projectWebsite" placeholder="https://example.com" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kimga berish</label>
          <select id="projectAssignType" onchange="toggleProjectAssignOptions()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Barcha o'quvchilarga</option>
            <option value="group">Guruhga</option>
            <option value="individual">Alohida o'quvchilarga</option>
          </select>
        </div>
        
        <div id="projectGroupSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">Guruh tanlang</label>
          <select id="projectGroup" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Guruh tanlang</option>
            ${allGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
          </select>
        </div>
        
        <div id="projectStudentSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">O'quvchilar tanlang</label>
          <div class="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            ${allStudents.map(student => `
              <label class="flex items-center space-x-2 p-1">
                <input type="checkbox" name="projectStudents" value="${student.id}" class="rounded">
                <span class="text-sm">${student.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Yaratish
          </button>
        </div>
      </div>
    </form>
  `)
}

// Toggle project assign options
function toggleProjectAssignOptions() {
  const assignType = document.getElementById("projectAssignType").value
  const groupSelect = document.getElementById("projectGroupSelect")
  const studentSelect = document.getElementById("projectStudentSelect")
  
  groupSelect.classList.add("hidden")
  studentSelect.classList.add("hidden")
  
  if (assignType === "group") {
    groupSelect.classList.remove("hidden")
  } else if (assignType === "individual") {
    studentSelect.classList.remove("hidden")
  }
}

// Create project
async function createProject(event) {
  event.preventDefault()
  
  try {
    const title = document.getElementById("projectTitle").value.trim()
    const description = document.getElementById("projectDescription").value.trim()
    const deadline = document.getElementById("projectDeadline").value
    const payment = parseInt(document.getElementById("projectPayment").value) || 1000
    const websiteUrl = document.getElementById("projectWebsite").value.trim() || null
    const assignType = document.getElementById("projectAssignType").value
    
    let groupId = null
    let assignedStudents = null
    
    if (assignType === "group") {
      groupId = document.getElementById("projectGroup").value || null
    } else if (assignType === "individual") {
      const selectedStudents = Array.from(document.querySelectorAll('input[name="projectStudents"]:checked'))
        .map(cb => cb.value)
      assignedStudents = selectedStudents.length > 0 ? selectedStudents : null
    }
    
    await firebaseManager.createProject(title, description, deadline, payment, groupId, assignedStudents, websiteUrl)
    showNotification("Loyiha muvaffaqiyatli yaratildi", "success")
    closeModal()
    await loadProjects()
  } catch (error) {
    console.error("Loyiha yaratishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Show project submissions
async function showProjectSubmissions(projectId) {
  try {
    const project = allProjects.find(p => p.id === projectId)
    const submissions = await firebaseManager.getArrayData("projectSubmissions")
    const projectSubmissions = submissions.filter(s => s.projectId === projectId)
    
    showModal(`"${project.title}" topshiriqlari`, `
      <div class="space-y-4">
        ${projectSubmissions.length === 0 ? 
          '<p class="text-gray-500 text-center">Hozircha topshiriqlar yo\'q</p>' :
          projectSubmissions.map(submission => {
            const student = allStudents.find(s => s.id === submission.studentId)
            return `
              <div class="border rounded-lg p-4 ${submission.status === 'pending' ? 'bg-yellow-50' : submission.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-semibold">${student ? student.name : 'Noma\'lum'}</h4>
                    <p class="text-sm text-gray-500">${formatDate(submission.submittedAt)}</p>
                  </div>
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }">
                    ${submission.status === 'pending' ? 'Kutilmoqda' : submission.status === 'approved' ? 'Qabul qilindi' : 'Rad etildi'}
                  </span>
                </div>
                
                <div class="mb-3">
                  <p class="text-sm text-gray-700">${submission.description || 'Tavsif yo\'q'}</p>
                </div>
                
                ${submission.status === 'pending' ? `
                  <div class="flex space-x-2">
                    <button onclick="showGradeProjectModal('${submission.id}', '${project.payment}')" class="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600">
                      Baholash
                    </button>
                  </div>
                ` : submission.feedback ? `
                  <div class="mt-2 p-2 bg-gray-100 rounded">
                    <p class="text-sm text-gray-600">Izoh: ${submission.feedback}</p>
                    ${submission.reward ? `<p class="text-sm font-medium">Berilgan coin: ${submission.reward}</p>` : ''}
                  </div>
                ` : ''}
              </div>
            `
          }).join('')
        }
      </div>
    `)
  } catch (error) {
    console.error("Loyiha topshiriqlarini yuklashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Show grade project modal
function showGradeProjectModal(submissionId, defaultPayment) {
  showModal("Loyihani baholash", `
    <form onsubmit="gradeProject(event, '${submissionId}')">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Coin miqdori</label>
          <input type="number" id="projectReward" value="${defaultPayment}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
          <p class="text-xs text-gray-500 mt-1">0 coin = rad etish</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Izoh (ixtiyoriy)</label>
          <textarea id="projectFeedback" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Izoh yozing..."></textarea>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
            Baholash
          </button>
        </div>
      </div>
    </form>
  `)
}

// Grade project
async function gradeProject(event, submissionId) {
  event.preventDefault()
  
  try {
    const reward = parseInt(document.getElementById("projectReward").value)
    const feedback = document.getElementById("projectFeedback").value.trim()
    
    await firebaseManager.gradeProjectSubmission(submissionId, reward, feedback)
    showNotification("Loyiha muvaffaqiyatli baholandi", "success")
    closeModal()
  } catch (error) {
    console.error("Loyihani baholashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load groups
async function loadGroups() {
  try {
    allGroups = await firebaseManager.getArrayData("groups")
    displayGroups(allGroups)
  } catch (error) {
    console.error("Guruhlarni yuklashda xatolik:", error)
  }
}

// Display groups
function displayGroups(groups) {
  const container = document.getElementById("groupsContainer")
  
  if (groups.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha guruhlar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${groups
        .map(
          (group) => `
        <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-800">${group.name}</h3>
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              ${group.studentCount || 0} o'quvchi
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4">${group.description}</p>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Yaratilgan:</span>
              <span class="font-medium">${formatDate(group.createdAt)}</span>
            </div>
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button onclick="showGroupStudents('${group.id}')" class="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600">
              <i class="fas fa-users mr-1"></i>O'quvchilar
            </button>
            <button onclick="editGroup('${group.id}')" class="bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
}

// Show create group modal
function showCreateGroupModal() {
  showModal("Yangi guruh yaratish", `
    <form onsubmit="createGroup(event)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Guruh nomi *</label>
          <input type="text" id="groupName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tavsif</label>
          <textarea id="groupDescription" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">O'quvchilar tanlang</label>
          <div class="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
            ${allStudents.map(student => `
              <label class="flex items-center space-x-2 p-1">
                <input type="checkbox" name="groupStudents" value="${student.id}" class="rounded">
                <span class="text-sm">${student.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Yaratish
          </button>
        </div>
      </div>
    </form>
  `)
}

// Create group
async function createGroup(event) {
  event.preventDefault()
  
  try {
    const name = document.getElementById("groupName").value.trim()
    const description = document.getElementById("groupDescription").value.trim()
    const selectedStudents = Array.from(document.querySelectorAll('input[name="groupStudents"]:checked'))
      .map(cb => cb.value)
    
    await firebaseManager.createGroup(name, description, selectedStudents)
    showNotification("Guruh muvaffaqiyatli yaratildi", "success")
    closeModal()
    await loadGroups()
    await loadStudents() // Refresh students to show group assignments
  } catch (error) {
    console.error("Guruh yaratishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load payments
async function loadPayments() {
  try {
    const payments = await firebaseManager.getArrayData("monthlyPayments")
    const withdrawals = await firebaseManager.getArrayData("withdrawalRequests")
    
    displayPayments(payments)
    displayWithdrawals(withdrawals)
  } catch (error) {
    console.error("To'lovlarni yuklashda xatolik:", error)
  }
}

// Display payments
function displayPayments(payments) {
  const container = document.getElementById("paymentsContainer")
  
  if (payments.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha to\'lovlar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${payments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(payment => {
          const student = allStudents.find(s => s.id === payment.studentId)
          return `
            <div class="border rounded-lg p-4 ${payment.status === 'paid' ? 'bg-green-50' : payment.status === 'partial' ? 'bg-yellow-50' : 'bg-red-50'}">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold">${student ? student.name : 'Noma\'lum'}</h4>
                  <p class="text-sm text-gray-600">${payment.description}</p>
                  <p class="text-sm text-gray-500">${formatDate(payment.createdAt)}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold">${payment.amount.toLocaleString()} so'm</p>
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }">
                    ${payment.status === 'paid' ? 'To\'langan' : payment.status === 'partial' ? 'Qisman' : 'Kutilmoqda'}
                  </span>
                </div>
              </div>
              
              ${payment.status === 'pending' ? `
                <div class="mt-3 flex space-x-2">
                  <button onclick="confirmPayment('${payment.id}', '${payment.studentId}')" class="bg-green-500 text-white py-1 px-3 rounded text-sm hover:bg-green-600">
                    Tasdiqlash
                  </button>
                </div>
              ` : ''}
            </div>
          `
        }).join('')}
    </div>
  `
}

// Display withdrawals
function displayWithdrawals(withdrawals) {
  const container = document.getElementById("withdrawalsContainer")
  
  if (withdrawals.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha so\'rovlar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${withdrawals
        .filter(w => w.status === 'pending')
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
        .map(withdrawal => `
          <div class="border rounded-lg p-4 bg-yellow-50">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h4 class="font-semibold">${withdrawal.studentName}</h4>
                <p class="text-sm text-gray-500">${formatDate(withdrawal.requestedAt)}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold">${withdrawal.coins.toLocaleString()} coin</p>
                <p class="text-sm text-gray-600">${withdrawal.amount.toLocaleString()} so'm</p>
              </div>
            </div>
            
            <div class="text-sm text-gray-600 mb-3">
              <p>Karta: ${withdrawal.cardNumber}</p>
              <p>Usul: ${withdrawal.method}</p>
            </div>
            
            <div class="flex space-x-2">
              <button onclick="approveWithdrawal('${withdrawal.id}')" class="bg-green-500 text-white py-1 px-3 rounded text-sm hover:bg-green-600">
                Tasdiqlash
              </button>
              <button onclick="rejectWithdrawal('${withdrawal.id}')" class="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600">
                Rad etish
              </button>
            </div>
          </div>
        `).join('')}
    </div>
  `
}

// Confirm payment
async function confirmPayment(paymentId, studentId) {
  try {
    await firebaseManager.confirmPayment(paymentId, studentId)
    showNotification("To'lov tasdiqlandi", "success")
    await loadPayments()
    await loadStudents()
  } catch (error) {
    console.error("To'lovni tasdiqlashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Approve withdrawal
async function approveWithdrawal(requestId) {
  try {
    await firebaseManager.approveWithdrawal(requestId)
    showNotification("Pul yechish so'rovi tasdiqlandi", "success")
    await loadPayments()
    await loadStudents()
  } catch (error) {
    console.error("Pul yechish so'rovini tasdiqlashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load referrals
async function loadReferrals() {
  try {
    const referrals = await firebaseManager.getArrayData("referrals")
    displayReferrals(referrals)
  } catch (error) {
    console.error("Referallarni yuklashda xatolik:", error)
  }
}

// Display referrals
function displayReferrals(referrals) {
  const container = document.getElementById("referralsContainer")
  
  const pendingReferrals = referrals.filter(r => r.status === 'pending')
  
  if (pendingReferrals.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha kutilayotgan referal so\'rovlari yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${pendingReferrals.map(referral => `
        <div class="border rounded-lg p-4 bg-blue-50">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-semibold">${referral.referrerName}</h4>
              <p class="text-sm text-gray-600">Taklif qildi: ${referral.newUserName}</p>
              <p class="text-sm text-gray-500">${formatDate(referral.requestedAt)}</p>
            </div>
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Kutilmoqda
            </span>
          </div>
          
          <div class="text-sm text-gray-600 mb-3">
            <p>Email: ${referral.newUserEmail}</p>
            <p>Referal kod: ${referral.referralCode}</p>
          </div>
          
          <div class="flex space-x-2">
            <button onclick="approveReferral('${referral.id}')" class="bg-green-500 text-white py-1 px-3 rounded text-sm hover:bg-green-600">
              Tasdiqlash (20,000 coin)
            </button>
            <button onclick="rejectReferral('${referral.id}')" class="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600">
              Rad etish
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

// Approve referral
async function approveReferral(referralId) {
  try {
    await firebaseManager.approveReferral(referralId)
    showNotification("Referal so'rovi tasdiqlandi", "success")
    await loadReferrals()
    await loadStudents()
  } catch (error) {
    console.error("Referalni tasdiqlashda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Reject referral
async function rejectReferral(referralId) {
  const reason = prompt("Rad etish sababini kiriting:")
  if (!reason) return
  
  try {
    await firebaseManager.rejectReferral(referralId, reason)
    showNotification("Referal so'rovi rad etildi", "success")
    await loadReferrals()
  } catch (error) {
    console.error("Referalni rad etishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Load attendance
async function loadAttendance() {
  try {
    const attendanceRecords = await firebaseManager.getArrayData("attendanceRecords")
    displayAttendance(attendanceRecords)
  } catch (error) {
    console.error("Davomatni yuklashda xatolik:", error)
  }
}

// Display attendance
function displayAttendance(records) {
  const container = document.getElementById("attendanceContainer")
  
  if (records.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha davomat yozuvlari yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${records
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(record => {
          const group = allGroups.find(g => g.id === record.groupId)
          const attendanceCount = Object.values(record.attendanceData).filter(Boolean).length
          const totalCount = Object.keys(record.attendanceData).length
          
          return `
            <div class="border rounded-lg p-4 bg-white">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h4 class="font-semibold">${group ? group.name : 'Noma\'lum guruh'}</h4>
                  <p class="text-sm text-gray-500">${formatDate(record.date)}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold">${attendanceCount}/${totalCount}</p>
                  <p class="text-sm text-gray-600">Ishtirok etdi</p>
                </div>
              </div>
              
              <div class="text-sm text-gray-600">
                <p>Belgilangan: ${formatDate(record.markedAt)}</p>
              </div>
            </div>
          `
        }).join('')}
    </div>
  `
}

// Load tests
async function loadTests() {
  try {
    allTests = await firebaseManager.getArrayData("tests")
    displayTests(allTests)
  } catch (error) {
    console.error("Testlarni yuklashda xatolik:", error)
  }
}

// Display tests
function displayTests(tests) {
  const container = document.getElementById("testsContainer")
  
  if (tests.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Hozircha testlar yo\'q</p>'
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${tests
        .map(
          (test) => `
        <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-800">${test.title}</h3>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${
              test.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }">
              ${test.status === "active" ? "Faol" : "Nofaol"}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4">${test.description}</p>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Savollar:</span>
              <span class="font-medium">${test.questions.length} ta</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Vaqt:</span>
              <span class="font-medium">${test.timeLimit} daqiqa</span>
            </div>
            ${test.groupId ? `
            <div class="flex justify-between">
              <span class="text-gray-500">Guruh:</span>
              <span class="font-medium">${getGroupName(test.groupId)}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button onclick="showTestResults('${test.id}')" class="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600">
              <i class="fas fa-chart-bar mr-1"></i>Natijalar
            </button>
            <button onclick="editTest('${test.id}')" class="bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
}

// Show create test modal
function showCreateTestModal() {
  showModal("Yangi test yaratish", `
    <form onsubmit="createTest(event)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Test nomi *</label>
          <input type="text" id="testTitle" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tavsif</label>
          <textarea id="testDescription" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Vaqt limiti (daqiqa)</label>
          <input type="number" id="testTimeLimit" value="30" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kimga berish</label>
          <select id="testAssignType" onchange="toggleTestAssignOptions()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Barcha o'quvchilarga</option>
            <option value="group">Guruhga</option>
            <option value="individual">Alohida o'quvchilarga</option>
          </select>
        </div>
        
        <div id="testGroupSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">Guruh tanlang</label>
          <select id="testGroup" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Guruh tanlang</option>
            ${allGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
          </select>
        </div>
        
        <div id="testStudentSelect" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">O'quvchilar tanlang</label>
          <div class="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            ${allStudents.map(student => `
              <label class="flex items-center space-x-2 p-1">
                <input type="checkbox" name="testStudents" value="${student.id}" class="rounded">
                <span class="text-sm">${student.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Savollar</label>
          <div id="questionsContainer">
            <div class="question-item border rounded p-3 mb-3">
              <div class="mb-2">
                <input type="text" placeholder="Savol matni" class="w-full px-3 py-2 border border-gray-300 rounded-md question-text" required>
              </div>
              <div class="space-y-1">
                <input type="text" placeholder="A) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
                <input type="text" placeholder="B) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
                <input type="text" placeholder="C) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
                <input type="text" placeholder="D) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
              </div>
              <div class="mt-2">
                <select class="correct-answer w-full px-2 py-1 border border-gray-300 rounded" required>
                  <option value="">To'g'ri javobni tanlang</option>
                  <option value="0">A</option>
                  <option value="1">B</option>
                  <option value="2">C</option>
                  <option value="3">D</option>
                </select>
              </div>
            </div>
          </div>
          <button type="button" onclick="addQuestion()" class="bg-green-500 text-white py-1 px-3 rounded text-sm hover:bg-green-600">
            <i class="fas fa-plus mr-1"></i>Savol qo'shish
          </button>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
            Bekor qilish
          </button>
          <button type="submit" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Yaratish
          </button>
        </div>
      </div>
    </form>
  `)
}

// Toggle test assign options
function toggleTestAssignOptions() {
  const assignType = document.getElementById("testAssignType").value
  const groupSelect = document.getElementById("testGroupSelect")
  const studentSelect = document.getElementById("testStudentSelect")
  
  groupSelect.classList.add("hidden")
  studentSelect.classList.add("hidden")
  
  if (assignType === "group") {
    groupSelect.classList.remove("hidden")
  } else if (assignType === "individual") {
    studentSelect.classList.remove("hidden")
  }
}

// Add question
function addQuestion() {
  const container = document.getElementById("questionsContainer")
  const questionDiv = document.createElement("div")
  questionDiv.className = "question-item border rounded p-3 mb-3"
  questionDiv.innerHTML = `
    <div class="mb-2">
      <input type="text" placeholder="Savol matni" class="w-full px-3 py-2 border border-gray-300 rounded-md question-text" required>
    </div>
    <div class="space-y-1">
      <input type="text" placeholder="A) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
      <input type="text" placeholder="B) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
      <input type="text" placeholder="C) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
      <input type="text" placeholder="D) Variant" class="w-full px-2 py-1 border border-gray-300 rounded option-input" required>
    </div>
    <div class="mt-2 flex justify-between items-center">
      <select class="correct-answer flex-1 px-2 py-1 border border-gray-300 rounded mr-2" required>
        <option value="">To'g'ri javobni tanlang</option>
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
        <option value="3">D</option>
      </select>
      <button type="button" onclick="removeQuestion(this)" class="bg-red-500 text-white py-1 px-2 rounded text-sm hover:bg-red-600">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `
  container.appendChild(questionDiv)
}

// Remove question
function removeQuestion(button) {
  button.closest(".question-item").remove()
}

// Create test
async function createTest(event) {
  event.preventDefault()
  
  try {
    const title = document.getElementById("testTitle").value.trim()
    const description = document.getElementById("testDescription").value.trim()
    const timeLimit = parseInt(document.getElementById("testTimeLimit").value) || 30
    const assignType = document.getElementById("testAssignType").value
    
    let groupId = null
    let assignedStudents = null
    
    if (assignType === "group") {
      groupId = document.getElementById("testGroup").value || null
    } else if (assignType === "individual") {
      const selectedStudents = Array.from(document.querySelectorAll('input[name="testStudents"]:checked'))
        .map(cb => cb.value)
      assignedStudents = selectedStudents.length > 0 ? selectedStudents : null
    }
    
    // Collect questions
    const questionItems = document.querySelectorAll(".question-item")
    const questions = []
    
    questionItems.forEach(item => {
      const questionText = item.querySelector(".question-text").value.trim()
      const options = Array.from(item.querySelectorAll(".option-input")).map(input => input.value.trim())
      const correctAnswer = parseInt(item.querySelector(".correct-answer").value)
      
      if (questionText && options.every(opt => opt) && correctAnswer !== undefined) {
        questions.push({
          question: questionText,
          options: options,
          correctAnswer: correctAnswer
        })
      }
    })
    
    if (questions.length === 0) {
      alert("Kamida bitta savol qo'shing!")
      return
    }
    
    await firebaseManager.createTest(title, description, questions, timeLimit, groupId, assignedStudents)
    showNotification("Test muvaffaqiyatli yaratildi", "success")
    closeModal()
    await loadTests()
  } catch (error) {
    console.error("Test yaratishda xatolik:", error)
    showNotification("Xatolik yuz berdi", "error")
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${
    type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"
  }`
  notification.textContent = message

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 3000)
}

function showModal(title, content) {
  const modal = document.createElement("div")
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-xl font-semibold">${title}</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="p-6">
        ${content}
      </div>
    </div>
  `

  document.getElementById("modalsContainer").appendChild(modal)
}

function closeModal() {
  const modalsContainer = document.getElementById("modalsContainer")
  modalsContainer.innerHTML = ""
}

function logout() {
  sessionStorage.removeItem("currentUser")
  window.location.href = "index.html"
}

// Make functions global
window.showSection = showSection
window.loadStudents = loadStudents
window.showStudentActions = showStudentActions
window.showAdjustCoinsModal = showAdjustCoinsModal
window.adjustCoins = adjustCoins
window.showCreateTaskModal = showCreateTaskModal
window.toggleTaskAssignOptions = toggleTaskAssignOptions
window.createTask = createTask
window.showTaskSubmissions = showTaskSubmissions
window.showGradeSubmissionModal = showGradeSubmissionModal
window.gradeSubmission = gradeSubmission
window.showCreateProjectModal = showCreateProjectModal
window.toggleProjectAssignOptions = toggleProjectAssignOptions
window.createProject = createProject
window.showProjectSubmissions = showProjectSubmissions
window.showGradeProjectModal = showGradeProjectModal
window.gradeProject = gradeProject
window.showCreateGroupModal = showCreateGroupModal
window.createGroup = createGroup
window.confirmPayment = confirmPayment
window.approveWithdrawal = approveWithdrawal
window.approveReferral = approveReferral
window.rejectReferral = rejectReferral
window.showCreateTestModal = showCreateTestModal
window.toggleTestAssignOptions = toggleTestAssignOptions
window.addQuestion = addQuestion
window.removeQuestion = removeQuestion
window.createTest = createTest
window.closeModal = closeModal
window.logout = logout