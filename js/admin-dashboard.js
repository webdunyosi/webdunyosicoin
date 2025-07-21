import { firebaseManager } from './firebase.js'

// Global variables
let currentUser = null
let allStudents = []
let allGroups = []
let allTasks = []
let allTests = []
let allProjects = []
let allSubmissions = []
let allProjectSubmissions = []
let allWithdrawals = []
let allPayments = []
let allReferrals = []

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const userData = sessionStorage.getItem('currentUser')
    if (!userData) {
        window.location.href = 'index.html'
        return
    }

    currentUser = JSON.parse(userData)
    if (currentUser.role !== 'admin') {
        window.location.href = 'index.html'
        return
    }

    // Set admin name
    document.getElementById('adminName').textContent = currentUser.name

    // Load initial data
    await loadAllData()
    
    // Show dashboard by default
    showTab('dashboard')
    
    // Set up event listeners
    setupEventListeners()
    
    // Update connection status
    updateConnectionStatus()
})

// Setup event listeners
function setupEventListeners() {
    // Student search
    document.getElementById('studentSearch').addEventListener('input', filterStudents)
    
    // Group filter
    document.getElementById('groupFilter').addEventListener('change', filterStudents)
    
    // Assignment type radio buttons
    document.querySelectorAll('input[name="assignmentType"]').forEach(radio => {
        radio.addEventListener('change', handleAssignmentTypeChange)
    })
    
    // Attendance group filter
    document.getElementById('attendanceGroupFilter').addEventListener('change', loadAttendanceList)
    
    // Set today's date for attendance
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0]
}

// Load all data
async function loadAllData() {
    try {
        showNotification('Ma\'lumotlar yuklanmoqda...', 'info')
        
        // Load all data in parallel
        const [students, groups, tasks, tests, projects, submissions, projectSubmissions, withdrawals, payments, referrals] = await Promise.all([
            firebaseManager.getArrayData('users'),
            firebaseManager.getArrayData('groups'),
            firebaseManager.getArrayData('tasks'),
            firebaseManager.getArrayData('tests'),
            firebaseManager.getArrayData('projects'),
            firebaseManager.getArrayData('submissions'),
            firebaseManager.getArrayData('projectSubmissions'),
            firebaseManager.getArrayData('withdrawalRequests'),
            firebaseManager.getArrayData('monthlyPayments'),
            firebaseManager.getArrayData('referrals')
        ])
        
        allStudents = students.filter(u => u.role === 'student')
        allGroups = groups
        allTasks = tasks
        allTests = tests
        allProjects = projects
        allSubmissions = submissions
        allProjectSubmissions = projectSubmissions
        allWithdrawals = withdrawals
        allPayments = payments
        allReferrals = referrals
        
        // Update dashboard stats
        updateDashboardStats()
        
        showNotification('Ma\'lumotlar muvaffaqiyatli yuklandi', 'success')
    } catch (error) {
        console.error('Ma\'lumotlarni yuklashda xatolik:', error)
        showNotification('Ma\'lumotlarni yuklashda xatolik yuz berdi', 'error')
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    document.getElementById('totalStudents').textContent = allStudents.length
    document.getElementById('totalGroups').textContent = allGroups.length
    document.getElementById('totalTasks').textContent = allTasks.length
    document.getElementById('totalPayments').textContent = allPayments.length
    
    // Load recent activity
    loadRecentActivity()
}

// Load recent activity
function loadRecentActivity() {
    const recentActivity = document.getElementById('recentActivity')
    const activities = []
    
    // Add recent submissions
    allSubmissions.slice(-5).forEach(submission => {
        const student = allStudents.find(s => s.id === submission.studentId)
        const task = allTasks.find(t => t.id === submission.taskId)
        if (student && task) {
            activities.push({
                text: `${student.name} "${task.title}" vazifasini topshirdi`,
                time: new Date(submission.submittedAt).toLocaleString('uz-UZ')
            })
        }
    })
    
    // Add recent registrations
    allStudents.slice(-3).forEach(student => {
        activities.push({
            text: `${student.name} tizimga ro'yxatdan o'tdi`,
            time: new Date(student.joinDate).toLocaleString('uz-UZ')
        })
    })
    
    // Sort by time and take last 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time))
    
    recentActivity.innerHTML = activities.slice(0, 5).map(activity => `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <span class="text-sm text-gray-700">${activity.text}</span>
            <span class="text-xs text-gray-500">${activity.time}</span>
        </div>
    `).join('') || '<div class="text-gray-500 text-center py-4">Hozircha faoliyat yo\'q</div>'
}

// Show tab content
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden')
    })
    
    // Show selected tab content
    document.getElementById(tabName + 'Content').classList.remove('hidden')
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-blue-600', 'bg-blue-50')
        item.classList.add('text-gray-700')
    })
    
    // Update page title
    const titles = {
        dashboard: 'Admin Paneli',
        students: 'O\'quvchilar',
        groups: 'Guruhlar',
        tasks: 'Vazifalar',
        tests: 'Testlar',
        projects: 'Loyihalar',
        attendance: 'Davomat',
        payments: 'To\'lovlar',
        referrals: 'Referallar',
        analytics: 'Statistika'
    }
    
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Admin Paneli'
    
    // Load tab-specific content
    switch(tabName) {
        case 'students':
            loadStudents()
            break
        case 'groups':
            loadGroups()
            break
        case 'tasks':
            loadTasks()
            break
        case 'tests':
            loadTests()
            break
        case 'projects':
            loadProjects()
            break
        case 'attendance':
            loadAttendanceGroups()
            break
        case 'payments':
            loadPayments()
            break
        case 'referrals':
            loadReferrals()
            break
        case 'analytics':
            loadAnalytics()
            break
    }
    
    // Close mobile menu if open
    document.getElementById('sidebar').classList.add('-translate-x-full')
    document.getElementById('mobileMenuOverlay').classList.add('hidden')
}

// Load students
function loadStudents() {
    const studentsList = document.getElementById('studentsList')
    const groupFilter = document.getElementById('groupFilter')
    
    // Populate group filter
    groupFilter.innerHTML = '<option value="">Barcha guruhlar</option>'
    allGroups.forEach(group => {
        groupFilter.innerHTML += `<option value="${group.id}">${group.name}</option>`
    })
    
    // Populate coin management selects
    populateCoinSelects()
    
    // Display students
    // Skeleton loader ni ko'rsatish
    const studentsList2 = document.getElementById("studentsList")
    studentsList2.innerHTML = `
      <div class="skeleton-card">
        <div class="flex items-center space-x-4 p-4">
          <div class="skeleton w-12 h-12 rounded-full"></div>
          <div class="flex-1">
            <div class="skeleton h-4 rounded w-3/4 mb-2"></div>
            <div class="skeleton h-3 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <div class="skeleton-card">
        <div class="flex items-center space-x-4 p-4">
          <div class="skeleton w-12 h-12 rounded-full"></div>
          <div class="flex-1">
            <div class="skeleton h-4 rounded w-3/4 mb-2"></div>
            <div class="skeleton h-3 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <div class="skeleton-card">
        <div class="flex items-center space-x-4 p-4">
          <div class="skeleton w-12 h-12 rounded-full"></div>
          <div class="flex-1">
            <div class="skeleton h-4 rounded w-3/4 mb-2"></div>
            <div class="skeleton h-3 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    `

    displayStudents(allStudents)
}

// Display students
function displayStudents(students) {
    // Ma'lumotlar yuklangandan keyin skeleton loader ni olib tashlash
    const studentsList = document.getElementById('studentsList')
    
    if (students.length === 0) {
        studentsList.innerHTML = '<div class="text-gray-500 text-center py-8">O\'quvchilar topilmadi</div>'
        return
    }
    
    studentsList.innerHTML = students.map(student => {
        const group = allGroups.find(g => g.id === student.groupId)
        const paymentStatus = getPaymentStatusBadge(student.paymentStatus)
        
        return `
            <div class="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div class="flex items-center space-x-4 flex-1">
                        <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span class="text-white font-bold text-lg">${student.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold text-gray-800">${student.name}</h3>
                            <div class="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                                <span>${student.email}</span>
                                <span class="text-gray-400">•</span>
                                <span>${student.telegram}</span>
                                ${group ? `<span class="text-gray-400">•</span><span class="text-blue-600">${group.name}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                        <div class="flex items-center space-x-4 text-sm">
                            <div class="text-center">
                                <div class="font-bold text-purple-600">${(student.rating || 0).toLocaleString()}</div>
                                <div class="text-gray-500">Coin</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="showEditStudentModal('${student.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Filter students
function filterStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase()
    const selectedGroup = document.getElementById('groupFilter').value
    
    const filteredStudents = allStudents.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm) ||
                            student.email.toLowerCase().includes(searchTerm) ||
                            student.telegram.toLowerCase().includes(searchTerm)
        
        const matchesGroup = !selectedGroup || student.groupId === selectedGroup
        
        return matchesSearch && matchesGroup
    })
    
    displayStudents(filteredStudents)
}

// Show edit student modal
function showEditStudentModal(studentId) {
    const student = allStudents.find(s => s.id === studentId)
    if (!student) return
    
    // Create modal HTML
    const modalHTML = `
        <div id="editStudentModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-md w-full">
                <div class="p-6 border-b border-gray-100">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-bold text-gray-800">O'quvchini tahrirlash</h3>
                        <button onclick="closeEditStudentModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Ism Familiya</label>
                        <input type="text" id="editStudentName" value="${student.name}" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" id="editStudentEmail" value="${student.email}" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Telegram</label>
                        <input type="text" id="editStudentTelegram" value="${student.telegram}" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Guruh</label>
                        <select id="editStudentGroup" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Guruh tanlanmagan</option>
                            ${allGroups.map(group => `
                                <option value="${group.id}" ${student.groupId === group.id ? 'selected' : ''}>${group.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Coin miqdori</label>
                        <input type="number" id="editStudentRating" value="${student.rating || 0}" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button onclick="closeEditStudentModal()" class="px-6 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                            Bekor qilish
                        </button>
                        <button onclick="updateStudent('${studentId}')" class="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200">
                            Saqlash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML)
}

// Close edit student modal
function closeEditStudentModal() {
    const modal = document.getElementById('editStudentModal')
    if (modal) {
        modal.remove()
    }
}

// Update student
async function updateStudent(studentId) {
    try {
        const name = document.getElementById('editStudentName').value.trim()
        const email = document.getElementById('editStudentEmail').value.trim()
        const telegram = document.getElementById('editStudentTelegram').value.trim()
        const groupId = document.getElementById('editStudentGroup').value
        const rating = parseInt(document.getElementById('editStudentRating').value) || 0
        
        if (!name || !email || !telegram) {
            showNotification('Barcha maydonlarni to\'ldiring', 'error')
            return
        }
        
        // Check if email is unique
        const existingStudent = allStudents.find(s => s.email === email && s.id !== studentId)
        if (existingStudent) {
            showNotification('Bu email allaqachon ishlatilmoqda', 'error')
            return
        }
        
        const updates = {
            name,
            email,
            telegram,
            groupId: groupId || null,
            rating,
            updatedAt: new Date().toISOString()
        }
        
        await firebaseManager.updateInArray('users', studentId, updates)
        
        // Update local data
        const studentIndex = allStudents.findIndex(s => s.id === studentId)
        if (studentIndex !== -1) {
            Object.assign(allStudents[studentIndex], updates)
        }
        
        closeEditStudentModal()
        loadStudents()
        showNotification('O\'quvchi ma\'lumotlari yangilandi', 'success')
        
    } catch (error) {
        console.error('O\'quvchini yangilashda xatolik:', error)
        showNotification('O\'quvchini yangilashda xatolik yuz berdi', 'error')
    }
}

// Populate coin management selects
function populateCoinSelects() {
    const coinStudentSelect = document.getElementById('coinStudentSelect')
    const removeCoinStudentSelect = document.getElementById('removeCoinStudentSelect')
    const paymentStudentSelect = document.getElementById('paymentStudentSelect')
    
    const studentOptions = allStudents.map(student => 
        `<option value="${student.id}">${student.name} (${(student.rating || 0).toLocaleString()} coin)</option>`
    ).join('')
    
    if (coinStudentSelect) coinStudentSelect.innerHTML = '<option value="">O\'quvchi tanlang</option>' + studentOptions
    if (removeCoinStudentSelect) removeCoinStudentSelect.innerHTML = '<option value="">O\'quvchi tanlang</option>' + studentOptions
    if (paymentStudentSelect) paymentStudentSelect.innerHTML = '<option value="">O\'quvchi tanlang</option>' + studentOptions
}

// Show/hide coin modals
function showAddCoinsModal() {
    document.getElementById('addCoinsModal').classList.remove('hidden')
    document.getElementById('addCoinsModal').classList.add('flex')
}

function closeAddCoinsModal() {
    document.getElementById('addCoinsModal').classList.add('hidden')
    document.getElementById('addCoinsModal').classList.remove('flex')
    // Reset form
    document.getElementById('coinStudentSelect').value = ''
    document.getElementById('coinAmount').value = ''
    document.getElementById('coinReason').value = ''
}

function showRemoveCoinsModal() {
    document.getElementById('removeCoinsModal').classList.remove('hidden')
    document.getElementById('removeCoinsModal').classList.add('flex')
}

function closeRemoveCoinsModal() {
    document.getElementById('removeCoinsModal').classList.add('hidden')
    document.getElementById('removeCoinsModal').classList.remove('flex')
    // Reset form
    document.getElementById('removeCoinStudentSelect').value = ''
    document.getElementById('removeCoinAmount').value = ''
    document.getElementById('removeCoinReason').value = ''
}

// Add coins to student
async function addCoinsToStudent() {
    try {
        const studentId = document.getElementById('coinStudentSelect').value
        const amount = parseInt(document.getElementById('coinAmount').value)
        const reason = document.getElementById('coinReason').value.trim()
        
        if (!studentId || !amount || !reason) {
            showNotification('Barcha maydonlarni to\'ldiring', 'error')
            return
        }
        
        if (amount <= 0) {
            showNotification('Coin miqdori musbat bo\'lishi kerak', 'error')
            return
        }
        
        await firebaseManager.adjustCoins(studentId, amount, reason, 'admin_add')
        
        // Update local data
        const student = allStudents.find(s => s.id === studentId)
        if (student) {
            student.rating = (student.rating || 0) + amount
        }
        
        closeAddCoinsModal()
        loadStudents()
        showNotification(`${amount.toLocaleString()} coin muvaffaqiyatli qo'shildi`, 'success')
        
    } catch (error) {
        console.error('Coin qo\'shishda xatolik:', error)
        showNotification('Coin qo\'shishda xatolik yuz berdi', 'error')
    }
}

// Remove coins from student
async function removeCoinsFromStudent() {
    try {
        const studentId = document.getElementById('removeCoinStudentSelect').value
        const amount = parseInt(document.getElementById('removeCoinAmount').value)
        const reason = document.getElementById('removeCoinReason').value.trim()
        
        if (!studentId || !amount || !reason) {
            showNotification('Barcha maydonlarni to\'ldiring', 'error')
            return
        }
        
        if (amount <= 0) {
            showNotification('Coin miqdori musbat bo\'lishi kerak', 'error')
            return
        }
        
        await firebaseManager.adjustCoins(studentId, -amount, reason, 'admin_remove')
        
        // Update local data
        const student = allStudents.find(s => s.id === studentId)
        if (student) {
            student.rating = Math.max(0, (student.rating || 0) - amount)
        }
        
        closeRemoveCoinsModal()
        loadStudents()
        showNotification(`${amount.toLocaleString()} coin muvaffaqiyatli ayirildi`, 'success')
        
    } catch (error) {
        console.error('Coin ayirishda xatolik:', error)
        showNotification('Coin ayirishda xatolik yuz berdi', 'error')
    }
}

// Load groups
function loadGroups() {
    const groupsList = document.getElementById('groupsList')
    
    if (allGroups.length === 0) {
        groupsList.innerHTML = '<div class="col-span-full text-gray-500 text-center py-8">Guruhlar topilmadi</div>'
        return
    }
    
    groupsList.innerHTML = allGroups.map(group => {
        const studentsInGroup = allStudents.filter(s => s.groupId === group.id)
        
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-800">${group.name}</h3>
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        ${studentsInGroup.length} o'quvchi
                    </span>
                </div>
                <p class="text-gray-600 text-sm mb-4">${group.description || 'Tavsif yo\'q'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                        ${new Date(group.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                    <button onclick="showGroupStudents('${group.id}')" class="bg-blue-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                        O'quvchilarni ko'rish
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// Show group students
function showGroupStudents(groupId) {
    const group = allGroups.find(g => g.id === groupId)
    const studentsInGroup = allStudents.filter(s => s.groupId === groupId)
    
    if (!group) return
    
    const modalHTML = `
        <div id="groupStudentsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-100">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-bold text-gray-800">${group.name} - O'quvchilar</h3>
                        <button onclick="closeGroupStudentsModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    ${studentsInGroup.length === 0 ? 
                        '<div class="text-gray-500 text-center py-8">Bu guruhda o\'quvchilar yo\'q</div>' :
                        `<div class="space-y-3">
                            ${studentsInGroup.map(student => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold">${student.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-800">${student.name}</div>
                                            <div class="text-sm text-gray-600">${student.email}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-bold text-purple-600">${(student.rating || 0).toLocaleString()}</div>
                                        <div class="text-xs text-gray-500">coin</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
            </div>
        </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
}

// Close group students modal
function closeGroupStudentsModal() {
    const modal = document.getElementById('groupStudentsModal')
    if (modal) {
        modal.remove()
    }
}

// Show/hide group modal
function showCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('hidden')
    document.getElementById('createGroupModal').classList.add('flex')
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.add('hidden')
    document.getElementById('createGroupModal').classList.remove('flex')
    // Reset form
    document.getElementById('groupName').value = ''
    document.getElementById('groupDescription').value = ''
}

// Create group
async function createGroup() {
    try {
        const name = document.getElementById('groupName').value.trim()
        const description = document.getElementById('groupDescription').value.trim()
        
        if (!name) {
            showNotification('Guruh nomini kiriting', 'error')
            return
        }
        
        const groupId = await firebaseManager.createGroup(name, description)
        
        // Add to local data
        allGroups.push({
            id: groupId,
            name,
            description,
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
            studentCount: 0,
            studentIds: []
        })
        
        closeCreateGroupModal()
        loadGroups()
        updateDashboardStats()
        showNotification('Guruh muvaffaqiyatli yaratildi', 'success')
        
    } catch (error) {
        console.error('Guruh yaratishda xatolik:', error)
        showNotification('Guruh yaratishda xatolik yuz berdi', 'error')
    }
}

// Load tasks
function loadTasks() {
    const tasksList = document.getElementById('tasksList')
    
    if (allTasks.length === 0) {
        tasksList.innerHTML = '<div class="text-gray-500 text-center py-8">Vazifalar topilmadi</div>'
        return
    }
    
    tasksList.innerHTML = allTasks.map(task => {
        const submissions = allSubmissions.filter(s => s.taskId === task.id)
        const deadline = new Date(task.deadline)
        const isExpired = deadline < new Date()
        
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="font-semibold text-gray-800">${task.title}</h3>
                            ${isExpired ? '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Muddati o\'tgan</span>' : ''}
                        </div>
                        <p class="text-gray-600 text-sm mb-3">${task.description}</p>
                        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span><i class="fas fa-calendar mr-1"></i>${deadline.toLocaleDateString('uz-UZ')}</span>
                            <span><i class="fas fa-coins mr-1"></i>${task.reward} coin</span>
                            <span><i class="fas fa-paper-plane mr-1"></i>${submissions.length} topshiriq</span>
                            ${task.websiteUrl ? `<a href="${task.websiteUrl}" target="_blank" class="text-blue-600 hover:text-blue-800"><i class="fas fa-external-link-alt mr-1"></i>Website</a>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="showTaskSubmissions('${task.id}')" class="bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                            <i class="fas fa-eye mr-1"></i>Topshiriqlar
                        </button>
                        <button onclick="deleteTask('${task.id}')" class="bg-red-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors duration-200">
                            <i class="fas fa-trash mr-1"></i>O'chirish
                        </button>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Vazifani o\'chirishni tasdiqlaysizmi?')) return
    
    try {
        await firebaseManager.deleteData(`tasks/${taskId}`)
        
        // Remove from local data
        allTasks = allTasks.filter(t => t.id !== taskId)
        
        loadTasks()
        updateDashboardStats()
        showNotification('Vazifa muvaffaqiyatli o\'chirildi', 'success')
        
    } catch (error) {
        console.error('Vazifani o\'chirishda xatolik:', error)
        showNotification('Vazifani o\'chirishda xatolik yuz berdi', 'error')
    }
}

// Show task submissions
function showTaskSubmissions(taskId) {
    const task = allTasks.find(t => t.id === taskId)
    const submissions = allSubmissions.filter(s => s.taskId === taskId)
    
    if (!task) return
    
    document.getElementById('submissionModalTitle').textContent = `"${task.title}" topshiriqlari`
    
    const submissionsList = document.getElementById('submissionsList')
    
    if (submissions.length === 0) {
        submissionsList.innerHTML = '<div class="text-gray-500 text-center py-8">Hozircha topshiriqlar yo\'q</div>'
    } else {
        submissionsList.innerHTML = submissions.map(submission => {
            const student = allStudents.find(s => s.id === submission.studentId)
            const statusBadge = getSubmissionStatusBadge(submission.status)
            
            // Check if submission contains code
            const hasCode = submission.description && (
                submission.description.includes('function') ||
                submission.description.includes('const ') ||
                submission.description.includes('let ') ||
                submission.description.includes('var ') ||
                submission.description.includes('class ') ||
                submission.description.includes('import ') ||
                submission.description.includes('export ') ||
                submission.description.includes('console.log') ||
                submission.description.includes('document.') ||
                submission.description.includes('window.') ||
                submission.description.includes('</') ||
                submission.description.includes('</')
            )
            
            return `
                <div class="border border-gray-200 rounded-xl p-4 mb-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <span class="text-white font-bold">${student ? student.name.charAt(0).toUpperCase() : '?'}</span>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">${student ? student.name : 'Noma\'lum'}</h4>
                                <p class="text-sm text-gray-500">${new Date(submission.submittedAt).toLocaleString('uz-UZ')}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${statusBadge}
                            ${hasCode ? '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Kod bor</span>' : ''}
                        </div>
                    </div>
                    
                    ${submission.url ? `
                        <div class="mb-3">
                            <label class="block text-sm font-medium text-gray-700 mb-1">URL:</label>
                            <a href="${submission.url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm break-all">${submission.url}</a>
                        </div>
                    ` : ''}
                    
                    ${submission.description ? `
                        <div class="mb-3">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tavsif:</label>
                            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                                ${submission.description.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${submission.status === 'pending' ? `
                        <div class="flex items-center space-x-2 mt-4">
                            <input type="number" id="grade_${submission.id}" placeholder="Baho (0-100)" min="0" max="100" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                            <input type="text" id="feedback_${submission.id}" placeholder="Izoh (ixtiyoriy)" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                            <button onclick="gradeSubmission('${submission.id}')" class="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700">
                                Baholash
                            </button>
                        </div>
                    ` : ''}
                    
                    ${submission.grade !== undefined ? `
                        <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium">Baho: ${submission.grade}%</span>
                                <span class="text-xs text-gray-500">${new Date(submission.gradedAt).toLocaleString('uz-UZ')}</span>
                            </div>
                            ${submission.feedback ? `<p class="text-sm text-gray-600 mt-1">${submission.feedback}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            `
        }).join('')
    }
    
    document.getElementById('submissionsModal').classList.remove('hidden')
    document.getElementById('submissionsModal').classList.add('flex')
}

// Get submission status badge
function getSubmissionStatusBadge(status) {
    const badges = {
        pending: '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Kutilmoqda</span>',
        approved: '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Qabul qilindi</span>',
        rejected: '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Rad etildi</span>'
    }
    return badges[status] || badges.pending
}

// Get payment status badge
function getPaymentStatusBadge(status) {
    const badges = {
        paid: '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">To\'langan</span>',
        partial: '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Qisman</span>',
        unpaid: '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">To\'lanmagan</span>'
    }
    return badges[status] || badges.unpaid
}

// Grade submission
async function gradeSubmission(submissionId) {
    try {
        const grade = parseInt(document.getElementById(`grade_${submissionId}`).value)
        const feedback = document.getElementById(`feedback_${submissionId}`).value.trim()
        
        if (isNaN(grade) || grade < 0 || grade > 100) {
            showNotification('Baho 0 dan 100 gacha bo\'lishi kerak', 'error')
            return
        }
        
        await firebaseManager.gradeSubmission(submissionId, grade, feedback)
        
        // Update local data
        const submission = allSubmissions.find(s => s.id === submissionId)
        if (submission) {
            submission.status = grade >= 70 ? 'approved' : 'rejected'
            submission.grade = grade
            submission.feedback = feedback
            submission.gradedAt = new Date().toISOString()
        }
        
        // Refresh submissions modal
        const taskId = submission.taskId
        showTaskSubmissions(taskId)
        
        showNotification('Topshiriq muvaffaqiyatli baholandi', 'success')
        
    } catch (error) {
        console.error('Topshiriqni baholashda xatolik:', error)
        showNotification('Topshiriqni baholashda xatolik yuz berdi', 'error')
    }
}

// Close submissions modal
function closeSubmissionsModal() {
    document.getElementById('submissionsModal').classList.add('hidden')
    document.getElementById('submissionsModal').classList.remove('flex')
}

// Show/hide task modal
function showCreateTaskModal() {
    document.getElementById('createTaskModal').classList.remove('hidden')
    document.getElementById('createTaskModal').classList.add('flex')
    
    // Populate group select
    const groupSelect = document.getElementById('taskGroupSelect')
    groupSelect.innerHTML = '<option value="">Guruh tanlang</option>' + 
        allGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')
    
    // Populate student checkboxes
    const studentSelect = document.getElementById('taskStudentSelect')
    studentSelect.innerHTML = allStudents.map(student => `
        <label class="flex items-center space-x-2">
            <input type="checkbox" value="${student.id}" class="text-blue-600">
            <span class="text-sm text-gray-700">${student.name}</span>
        </label>
    `).join('')
}

function closeCreateTaskModal() {
    document.getElementById('createTaskModal').classList.add('hidden')
    document.getElementById('createTaskModal').classList.remove('flex')
    // Reset form
    document.getElementById('taskTitle').value = ''
    document.getElementById('taskDescription').value = ''
    document.getElementById('taskDeadline').value = ''
    document.getElementById('taskReward').value = '500'
    document.getElementById('taskWebsiteUrl').value = ''
    document.querySelectorAll('input[name="assignmentType"]')[0].checked = true
    handleAssignmentTypeChange()
}

// Handle assignment type change
function handleAssignmentTypeChange() {
    const assignmentType = document.querySelector('input[name="assignmentType"]:checked').value
    const groupDiv = document.getElementById('groupSelectionDiv')
    const studentDiv = document.getElementById('studentSelectionDiv')
    
    groupDiv.classList.add('hidden')
    studentDiv.classList.add('hidden')
    
    if (assignmentType === 'groups') {
        groupDiv.classList.remove('hidden')
    } else if (assignmentType === 'students') {
        studentDiv.classList.remove('hidden')
    }
}

// Create task
async function createTask() {
    try {
        const title = document.getElementById('taskTitle').value.trim()
        const description = document.getElementById('taskDescription').value.trim()
        const deadline = document.getElementById('taskDeadline').value
        const reward = parseInt(document.getElementById('taskReward').value) || 50
        const websiteUrl = document.getElementById('taskWebsiteUrl').value.trim()
        const assignmentType = document.querySelector('input[name="assignmentType"]:checked').value
        
        if (!title || !description || !deadline) {
            showNotification('Majburiy maydonlarni to\'ldiring', 'error')
            return
        }
        
        let groupId = null
        let assignedStudents = null
        
        if (assignmentType === 'groups') {
            groupId = document.getElementById('taskGroupSelect').value
            if (!groupId) {
                showNotification('Guruh tanlang', 'error')
                return
            }
        } else if (assignmentType === 'students') {
            const selectedStudents = Array.from(document.querySelectorAll('#taskStudentSelect input:checked')).map(cb => cb.value)
            if (selectedStudents.length === 0) {
                showNotification('Kamida bitta o\'quvchi tanlang', 'error')
                return
            }
            assignedStudents = selectedStudents
        }
        
        const taskId = await firebaseManager.createTask(
            title, 
            description, 
            deadline, 
            reward, 
            groupId, 
            websiteUrl || null, 
            assignedStudents
        )
        
        // Add to local data
        allTasks.push({
            id: taskId,
            title,
            description,
            deadline,
            reward,
            groupId,
            websiteUrl,
            assignedStudents,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        })
        
        closeCreateTaskModal()
        loadTasks()
        updateDashboardStats()
        showNotification('Vazifa muvaffaqiyatli yaratildi', 'success')
        
    } catch (error) {
        console.error('Vazifa yaratishda xatolik:', error)
        showNotification('Vazifa yaratishda xatolik yuz berdi', 'error')
    }
}

// Load tests
function loadTests() {
    const testsList = document.getElementById('testsList')
    
    if (allTests.length === 0) {
        testsList.innerHTML = '<div class="text-gray-500 text-center py-8">Testlar topilmadi</div>'
        return
    }
    
    testsList.innerHTML = allTests.map(test => {
        const results = allSubmissions.filter(s => s.testId === test.id) // This should be test results
        
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 mb-2">${test.title}</h3>
                        <p class="text-gray-600 text-sm mb-3">${test.description}</p>
                        <div class="flex items-center gap-4 text-sm text-gray-500">
                            <span><i class="fas fa-question-circle mr-1"></i>${test.questions ? test.questions.length : 0} savol</span>
                            <span><i class="fas fa-clock mr-1"></i>${test.timeLimit || 30} daqiqa</span>
                            <span><i class="fas fa-users mr-1"></i>${results.length} natija</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="deleteTest('${test.id}')" class="bg-red-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors duration-200">
                            <i class="fas fa-trash mr-1"></i>O'chirish
                        </button>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Delete test
async function deleteTest(testId) {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return
    
    try {
        await firebaseManager.deleteData(`tests/${testId}`)
        
        // Remove from local data
        allTests = allTests.filter(t => t.id !== testId)
        
        loadTests()
        updateDashboardStats()
        showNotification('Test muvaffaqiyatli o\'chirildi', 'success')
        
    } catch (error) {
        console.error('Testni o\'chirishda xatolik:', error)
        showNotification('Testni o\'chirishda xatolik yuz berdi', 'error')
    }
}

// Show/hide test modal
function showCreateTestModal() {
    document.getElementById('createTestModal').classList.remove('hidden')
    document.getElementById('createTestModal').classList.add('flex')
}

function closeCreateTestModal() {
    document.getElementById('createTestModal').classList.add('hidden')
    document.getElementById('createTestModal').classList.remove('flex')
    // Reset form
    document.getElementById('testTitle').value = ''
    document.getElementById('testDescription').value = ''
}

// Add question function
function addQuestion() {
    const container = document.getElementById('questionsContainer')
    const questionIndex = container.children.length + 1
    
    const questionDiv = document.createElement('div')
    questionDiv.className = 'border border-gray-200 rounded-xl p-6 question-item bg-gray-50'
    questionDiv.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h5 class="font-semibold text-gray-900 text-lg">Savol ${questionIndex}</h5>
            <button type="button" onclick="removeQuestion(this)" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                <i class="fas fa-trash text-lg"></i>
            </button>
        </div>
        <div class="space-y-4">
            <div>
                <input type="text" placeholder="Savol matni" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent question-text bg-white" required>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <input type="text" placeholder="Variant A" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent option-a bg-white" required>
                </div>
                <div>
                    <input type="text" placeholder="Variant B" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent option-b bg-white" required>
                </div>
                <div>
                    <input type="text" placeholder="Variant C" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent option-c bg-white" required>
                </div>
                <div>
                    <input type="text" placeholder="Variant D" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent option-d bg-white" required>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">To'g'ri javob:</label>
                <select class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent correct-answer bg-white" required>
                    <option value="" class="text-gray-400">Tanlang...</option>
                    <option value="A">Variant A</option>
                    <option value="B">Variant B</option>
                    <option value="C">Variant C</option>
                    <option value="D">Variant D</option>
                </select>
            </div>
        </div>
    `
    
    container.appendChild(questionDiv)
}

// Remove question function
function removeQuestion(button) {
    button.closest('.question-item').remove()
}

// Create test
async function createTest() {
    try {
        const title = document.getElementById('testTitle').value.trim()
        const description = document.getElementById('testDescription').value.trim()
        
        if (!title || !description) {
            showNotification('Barcha maydonlarni to\'ldiring', 'error')
            return
        }
        
        // For now, create test with empty questions array
        // In a real implementation, you would have a question builder
        const questions = []
        
        const testId = await firebaseManager.createTest(title, description, questions)
        
        // Add to local data
        allTests.push({
            id: testId,
            title,
            description,
            questions,
            timeLimit: 30,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        })
        
        closeCreateTestModal()
        loadTests()
        updateDashboardStats()
        showNotification('Test muvaffaqiyatli yaratildi', 'success')
        
    } catch (error) {
        console.error('Test yaratishda xatolik:', error)
        showNotification('Test yaratishda xatolik yuz berdi', 'error')
    }
}

// Load projects
function loadProjects() {
    const projectsList = document.getElementById('projectsList')
    
    if (allProjects.length === 0) {
        projectsList.innerHTML = '<div class="text-gray-500 text-center py-8">Loyihalar topilmadi</div>'
        return
    }
    
    projectsList.innerHTML = allProjects.map(project => {
        const submissions = allProjectSubmissions.filter(s => s.projectId === project.id)
        const deadline = new Date(project.deadline)
        const isExpired = deadline < new Date()
        
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="font-semibold text-gray-800">${project.title}</h3>
                            ${isExpired ? '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Muddati o\'tgan</span>' : ''}
                        </div>
                        <p class="text-gray-600 text-sm mb-3">${project.description}</p>
                        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span><i class="fas fa-calendar mr-1"></i>${deadline.toLocaleDateString('uz-UZ')}</span>
                            <span><i class="fas fa-coins mr-1"></i>${project.payment} coin</span>
                            <span><i class="fas fa-paper-plane mr-1"></i>${submissions.length} topshiriq</span>
                            ${project.websiteUrl ? `<a href="${project.websiteUrl}" target="_blank" class="text-blue-600 hover:text-blue-800"><i class="fas fa-external-link-alt mr-1"></i>Website</a>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="showProjectSubmissions('${project.id}')" class="bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                            <i class="fas fa-eye mr-1"></i>Topshiriqlar
                        </button>
                        <button onclick="deleteProject('${project.id}')" class="bg-red-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-700 transition-colors duration-200">
                            <i class="fas fa-trash mr-1"></i>O'chirish
                        </button>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Delete project
async function deleteProject(projectId) {
    if (!confirm('Loyihani o\'chirishni tasdiqlaysizmi?')) return
    
    try {
        await firebaseManager.deleteData(`projects/${projectId}`)
        
        // Remove from local data
        allProjects = allProjects.filter(p => p.id !== projectId)
        
        loadProjects()
        updateDashboardStats()
        showNotification('Loyiha muvaffaqiyatli o\'chirildi', 'success')
        
    } catch (error) {
        console.error('Loyihani o\'chirishda xatolik:', error)
        showNotification('Loyihani o\'chirishda xatolik yuz berdi', 'error')
    }
}

// Show project submissions
function showProjectSubmissions(projectId) {
    const project = allProjects.find(p => p.id === projectId)
    const submissions = allProjectSubmissions.filter(s => s.projectId === projectId)
    
    if (!project) return
    
    document.getElementById('submissionModalTitle').textContent = `"${project.title}" topshiriqlari`
    
    const submissionsList = document.getElementById('submissionsList')
    
    if (submissions.length === 0) {
        submissionsList.innerHTML = '<div class="text-gray-500 text-center py-8">Hozircha topshiriqlar yo\'q</div>'
    } else {
        submissionsList.innerHTML = submissions.map(submission => {
            const student = allStudents.find(s => s.id === submission.studentId)
            const statusBadge = getSubmissionStatusBadge(submission.status)
            
            return `
                <div class="border border-gray-200 rounded-xl p-4 mb-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span class="text-white font-bold">${student ? student.name.charAt(0).toUpperCase() : '?'}</span>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">${student ? student.name : 'Noma\'lum'}</h4>
                                <p class="text-sm text-gray-500">${new Date(submission.submittedAt).toLocaleString('uz-UZ')}</p>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Loyiha URL:</label>
                        <a href="${submission.url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm break-all">${submission.url}</a>
                    </div>
                    
                    ${submission.status === 'pending' ? `
                        <div class="flex items-center space-x-2 mt-4">
                            <button onclick="approveProjectSubmission('${submission.id}')" class="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700">
                                Qabul qilish
                            </button>
                            <button onclick="rejectProjectSubmission('${submission.id}')" class="bg-red-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-red-700">
                                Rad etish
                            </button>
                        </div>
                    ` : ''}
                </div>
            `
        }).join('')
    }
    
    document.getElementById('submissionsModal').classList.remove('hidden')
    document.getElementById('submissionsModal').classList.add('flex')
}

// Approve project submission
async function approveProjectSubmission(submissionId) {
    try {
        const submission = allProjectSubmissions.find(s => s.id === submissionId)
        if (!submission) return
        
        const project = allProjects.find(p => p.id === submission.projectId)
        if (!project) return
        
        // Update submission status
        await firebaseManager.updateInArray('projectSubmissions', submissionId, {
            status: 'approved',
            approvedAt: new Date().toISOString()
        })
        
        // Give coins to student
        const student = allStudents.find(s => s.id === submission.studentId)
        if (student) {
            await firebaseManager.updateInArray('users', submission.studentId, {
                rating: (student.rating || 0) + project.payment
            })
            
            // Update local data
            student.rating = (student.rating || 0) + project.payment
        }
        
        // Update local submission data
        submission.status = 'approved'
        submission.approvedAt = new Date().toISOString()
        
        // Refresh submissions modal
        showProjectSubmissions(submission.projectId)
        
        showNotification('Loyiha topshirig\'i qabul qilindi', 'success')
        
    } catch (error) {
        console.error('Loyiha topshirig\'ini qabul qilishda xatolik:', error)
        showNotification('Loyiha topshirig\'ini qabul qilishda xatolik yuz berdi', 'error')
    }
}

// Reject project submission
async function rejectProjectSubmission(submissionId) {
    try {
        await firebaseManager.updateInArray('projectSubmissions', submissionId, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        })
        
        // Update local data
        const submission = allProjectSubmissions.find(s => s.id === submissionId)
        if (submission) {
            submission.status = 'rejected'
            submission.rejectedAt = new Date().toISOString()
        }
        
        // Refresh submissions modal
        showProjectSubmissions(submission.projectId)
        
        showNotification('Loyiha topshirig\'i rad etildi', 'success')
        
    } catch (error) {
        console.error('Loyiha topshirig\'ini rad etishda xatolik:', error)
        showNotification('Loyiha topshirig\'ini rad etishda xatolik yuz berdi', 'error')
    }
}

// Show/hide project modal
function showCreateProjectModal() {
    document.getElementById('createProjectModal').classList.remove('hidden')
    document.getElementById('createProjectModal').classList.add('flex')
}

function closeCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('hidden')
    document.getElementById('createProjectModal').classList.remove('flex')
    // Reset form
    document.getElementById('projectTitle').value = ''
    document.getElementById('projectDescription').value = ''
    document.getElementById('projectDeadline').value = ''
    document.getElementById('projectPayment').value = '1000'
    document.getElementById('projectWebsiteUrl').value = ''
}

// Create project
async function createProject() {
    try {
        const title = document.getElementById('projectTitle').value.trim()
        const description = document.getElementById('projectDescription').value.trim()
        const deadline = document.getElementById('projectDeadline').value
        const payment = parseInt(document.getElementById('projectPayment').value) || 1000
        const websiteUrl = document.getElementById('projectWebsiteUrl').value.trim()
        
        if (!title || !description || !deadline) {
            showNotification('Majburiy maydonlarni to\'ldiring', 'error')
            return
        }
        
        const projectId = await firebaseManager.createProject(
            title, 
            description, 
            deadline, 
            payment, 
            null, // groupId
            null, // assignedStudents
            websiteUrl || null
        )
        
        // Add to local data
        allProjects.push({
            id: projectId,
            title,
            description,
            deadline,
            payment,
            websiteUrl,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        })
        
        closeCreateProjectModal()
        loadProjects()
        updateDashboardStats()
        showNotification('Loyiha muvaffaqiyatli yaratildi', 'success')
        
    } catch (error) {
        console.error('Loyiha yaratishda xatolik:', error)
        showNotification('Loyiha yaratishda xatolik yuz berdi', 'error')
    }
}

// Load attendance groups
function loadAttendanceGroups() {
    const groupFilter = document.getElementById('attendanceGroupFilter')
    groupFilter.innerHTML = '<option value="">Guruh tanlang</option>' + 
        allGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')
}

// Load attendance list
function loadAttendanceList() {
    const groupId = document.getElementById('attendanceGroupFilter').value
    const attendanceList = document.getElementById('attendanceList')
    
    if (!groupId) {
        attendanceList.innerHTML = '<div class="text-gray-500 text-center py-8">Guruh va sanani tanlang</div>'
        return
    }
    
    const studentsInGroup = allStudents.filter(s => s.groupId === groupId)
    
    if (studentsInGroup.length === 0) {
        attendanceList.innerHTML = '<div class="text-gray-500 text-center py-8">Bu guruhda o\'quvchilar yo\'q</div>'
        return
    }
    
    attendanceList.innerHTML = studentsInGroup.map(student => `
        <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">${student.name.charAt(0).toUpperCase()}</span>
                </div>
                <span class="font-medium text-gray-800">${student.name}</span>
            </div>
            <label class="flex items-center space-x-2">
                <input type="checkbox" id="attendance_${student.id}" class="w-5 h-5 text-green-600 rounded focus:ring-green-500">
                <span class="text-sm text-gray-600">Keldi</span>
            </label>
        </div>
    `).join('')
}

// Mark group attendance
async function markGroupAttendance() {
    try {
        const groupId = document.getElementById('attendanceGroupFilter').value
        const date = document.getElementById('attendanceDate').value
        
        if (!groupId || !date) {
            showNotification('Guruh va sanani tanlang', 'error')
            return
        }
        
        const studentsInGroup = allStudents.filter(s => s.groupId === groupId)
        const attendanceData = {}
        
        studentsInGroup.forEach(student => {
            const checkbox = document.getElementById(`attendance_${student.id}`)
            attendanceData[student.id] = checkbox ? checkbox.checked : false
        })
        
        await firebaseManager.markAttendance(groupId, date, attendanceData)
        
        showNotification('Davomat muvaffaqiyatli belgilandi', 'success')
        
        // Reset checkboxes
        studentsInGroup.forEach(student => {
            const checkbox = document.getElementById(`attendance_${student.id}`)
            if (checkbox) checkbox.checked = false
        })
        
    } catch (error) {
        console.error('Davomat belgilashda xatolik:', error)
        showNotification('Davomat belgilashda xatolik yuz berdi', 'error')
    }
}

// Load payments
function loadPayments() {
    loadMonthlyPayments()
    loadWithdrawalRequests()
    populateCoinSelects()
}

// Load monthly payments
function loadMonthlyPayments() {
    const paymentsList = document.getElementById('monthlyPaymentsList')
    
    if (allPayments.length === 0) {
        paymentsList.innerHTML = '<div class="text-gray-500 text-center py-8">To\'lovlar topilmadi</div>'
        return
    }
    
    paymentsList.innerHTML = allPayments.slice(-10).map(payment => {
        const student = allStudents.find(s => s.id === payment.studentId)
        const statusBadge = getPaymentStatusBadge(payment.status)
        
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${student ? student.name : 'Noma\'lum'}</div>
                    <div class="text-sm text-gray-600">${payment.description}</div>
                    <div class="text-sm text-gray-500">${payment.amount.toLocaleString()} so'm</div>
                </div>
                <div class="flex items-center space-x-2">
                    ${statusBadge}
                    ${payment.status === 'pending' ? `
                        <button onclick="confirmPayment('${payment.id}', '${payment.studentId}')" class="bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700">
                            Tasdiqlash
                        </button>
                    ` : ''}
                </div>
            </div>
        `
    }).join('')
}

// Load withdrawal requests
function loadWithdrawalRequests() {
    const withdrawalsList = document.getElementById('withdrawalRequestsList')
    
    if (allWithdrawals.length === 0) {
        withdrawalsList.innerHTML = '<div class="text-gray-500 text-center py-8">So\'rovlar topilmadi</div>'
        return
    }
    
    withdrawalsList.innerHTML = allWithdrawals.filter(w => w.status === 'pending').map(withdrawal => {
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${withdrawal.studentName}</div>
                    <div class="text-sm text-gray-600">${withdrawal.coins.toLocaleString()} coin → ${withdrawal.amount.toLocaleString()} so'm</div>
                    <div class="text-sm text-gray-500">${withdrawal.method}: ${withdrawal.cardNumber}</div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="approveWithdrawal('${withdrawal.id}')" class="bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700">
                        Tasdiqlash
                    </button>
                    <button onclick="rejectWithdrawal('${withdrawal.id}')" class="bg-red-600 text-white px-2 py-1 text-xs rounded hover:bg-red-700">
                        Rad etish
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// Confirm payment
async function confirmPayment(paymentId, studentId) {
    try {
        await firebaseManager.confirmPayment(paymentId, studentId)
        
        // Update local data
        const payment = allPayments.find(p => p.id === paymentId)
        if (payment) {
            payment.status = 'paid'
            payment.paidAt = new Date().toISOString()
        }
        
        const student = allStudents.find(s => s.id === studentId)
        if (student) {
            student.paymentStatus = 'paid'
            student.lastPaymentDate = new Date().toISOString()
            student.canWithdraw = true
        }
        
        loadPayments()
        loadStudents()
        showNotification('To\'lov tasdiqlandi', 'success')
        
    } catch (error) {
        console.error('To\'lovni tasdiqlashda xatolik:', error)
        showNotification('To\'lovni tasdiqlashda xatolik yuz berdi', 'error')
    }
}

// Approve withdrawal
async function approveWithdrawal(requestId) {
    try {
        await firebaseManager.approveWithdrawal(requestId)
        
        // Update local data
        const withdrawal = allWithdrawals.find(w => w.id === requestId)
        if (withdrawal) {
            withdrawal.status = 'approved'
            withdrawal.approvedAt = new Date().toISOString()
            
            // Update student's coin balance
            const student = allStudents.find(s => s.id === withdrawal.studentId)
            if (student) {
                student.rating = Math.max(0, (student.rating || 0) - withdrawal.coins)
            }
        }
        
        loadPayments()
        loadStudents()
        showNotification('Pul yechish so\'rovi tasdiqlandi', 'success')
        
    } catch (error) {
        console.error('Pul yechish so\'rovini tasdiqlashda xatolik:', error)
        showNotification('Pul yechish so\'rovini tasdiqlashda xatolik yuz berdi', 'error')
    }
}

// Reject withdrawal
async function rejectWithdrawal(requestId) {
    try {
        await firebaseManager.updateInArray('withdrawalRequests', requestId, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        })
        
        // Update local data
        const withdrawal = allWithdrawals.find(w => w.id === requestId)
        if (withdrawal) {
            withdrawal.status = 'rejected'
            withdrawal.rejectedAt = new Date().toISOString()
        }
        
        loadPayments()
        showNotification('Pul yechish so\'rovi rad etildi', 'success')
        
    } catch (error) {
        console.error('Pul yechish so\'rovini rad etishda xatolik:', error)
        showNotification('Pul yechish so\'rovini rad etishda xatolik yuz berdi', 'error')
    }
}

// Show/hide payment modal
function showCreatePaymentModal() {
    document.getElementById('createPaymentModal').classList.remove('hidden')
    document.getElementById('createPaymentModal').classList.add('flex')
}

function closeCreatePaymentModal() {
    document.getElementById('createPaymentModal').classList.add('hidden')
    document.getElementById('createPaymentModal').classList.remove('flex')
    // Reset form
    document.getElementById('paymentStudentSelect').value = ''
    document.getElementById('paymentAmount').value = ''
    document.getElementById('paymentDescription').value = ''
    document.getElementById('paymentDueDate').value = ''
}

// Create payment
async function createPayment() {
    try {
        const studentId = document.getElementById('paymentStudentSelect').value
        const amount = parseInt(document.getElementById('paymentAmount').value)
        const description = document.getElementById('paymentDescription').value.trim()
        const dueDate = document.getElementById('paymentDueDate').value
        
        if (!studentId || !amount || !description) {
            showNotification('Barcha majburiy maydonlarni to\'ldiring', 'error')
            return
        }
        
        if (amount <= 0) {
            showNotification('To\'lov miqdori musbat bo\'lishi kerak', 'error')
            return
        }
        
        const paymentIds = await firebaseManager.createMonthlyPayment([studentId], amount, description, dueDate)
        
        // Add to local data
        allPayments.push({
            id: paymentIds[0],
            studentId,
            amount,
            description,
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        })
        
        // Update student payment status
        const student = allStudents.find(s => s.id === studentId)
        if (student) {
            student.paymentStatus = 'unpaid'
            student.currentPaymentId = paymentIds[0]
            student.paymentAmount = amount
            student.paymentDescription = description
            student.canWithdraw = false
        }
        
        closeCreatePaymentModal()
        loadPayments()
        loadStudents()
        showNotification('To\'lov muvaffaqiyatli yaratildi', 'success')
        
    } catch (error) {
        console.error('To\'lov yaratishda xatolik:', error)
        showNotification('To\'lov yaratishda xatolik yuz berdi', 'error')
    }
}

// Load referrals
function loadReferrals() {
    const referralsList = document.getElementById('referralsList')
    
    if (allReferrals.length === 0) {
        referralsList.innerHTML = '<div class="text-gray-500 text-center py-8">Referal so\'rovlari topilmadi</div>'
        return
    }
    
    referralsList.innerHTML = allReferrals.filter(r => r.status === 'pending').map(referral => {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-6">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 mb-2">Referal so'rovi</h3>
                        <div class="space-y-1 text-sm text-gray-600">
                            <p><strong>Taklif qiluvchi:</strong> ${referral.referrerName}</p>
                            <p><strong>Yangi foydalanuvchi:</strong> ${referral.newUserName} (${referral.newUserEmail})</p>
                            <p><strong>Referal kod:</strong> ${referral.referralCode}</p>
                            <p><strong>Sana:</strong> ${new Date(referral.requestedAt).toLocaleDateString('uz-UZ')}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="approveReferral('${referral.id}')" class="bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700">
                            Tasdiqlash
                        </button>
                        <button onclick="rejectReferral('${referral.id}')" class="bg-red-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-700">
                            Rad etish
                        </button>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

// Approve referral
async function approveReferral(referralId) {
    try {
        await firebaseManager.approveReferral(referralId)
        
        // Update local data
        const referral = allReferrals.find(r => r.id === referralId)
        if (referral) {
            referral.status = 'approved'
            referral.approvedAt = new Date().toISOString()
            
            // Update referrer's coin balance
            const referrer = allStudents.find(s => s.id === referral.referrerId)
            if (referrer) {
                referrer.rating = (referrer.rating || 0) + 20000
            }
        }
        
        loadReferrals()
        loadStudents()
        showNotification('Referal so\'rovi tasdiqlandi', 'success')
        
    } catch (error) {
        console.error('Referal so\'rovini tasdiqlashda xatolik:', error)
        showNotification('Referal so\'rovini tasdiqlashda xatolik yuz berdi', 'error')
    }
}

// Reject referral
async function rejectReferral(referralId) {
    try {
        await firebaseManager.rejectReferral(referralId, 'Admin tomonidan rad etildi')
        
        // Update local data
        const referral = allReferrals.find(r => r.id === referralId)
        if (referral) {
            referral.status = 'rejected'
            referral.rejectedAt = new Date().toISOString()
        }
        
        loadReferrals()
        showNotification('Referal so\'rovi rad etildi', 'success')
        
    } catch (error) {
        console.error('Referal so\'rovini rad etishda xatolik:', error)
        showNotification('Referal so\'rovini rad etishda xatolik yuz berdi', 'error')
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        const stats = await firebaseManager.getStatistics()
        const paymentStats = await firebaseManager.getPaymentStatistics()
        
        // Update user activity chart
        const userActivityChart = document.getElementById('userActivityChart')
        userActivityChart.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Jami o'quvchilar</span>
                    <span class="font-bold text-blue-600">${stats.general.totalStudents}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Faol vazifalar</span>
                    <span class="font-bold text-purple-600">${stats.general.totalTasks}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Testlar</span>
                    <span class="font-bold text-green-600">${stats.general.totalTests}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Loyihalar</span>
                    <span class="font-bold text-orange-600">${stats.general.totalProjects}</span>
                </div>
            </div>
        `
        
        // Update payment statistics
        const paymentStatsDiv = document.getElementById('paymentStats')
        paymentStatsDiv.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">To'lagan o'quvchilar</span>
                    <span class="font-bold text-green-600">${stats.payments.paidStudents}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">To'lamagan o'quvchilar</span>
                    <span class="font-bold text-red-600">${stats.payments.unpaidStudents}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">To'lov foizi</span>
                    <span class="font-bold text-blue-600">${stats.payments.paymentRate}%</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Coin to'lovlar</span>
                    <span class="font-bold text-purple-600">${paymentStats.coinPayments.totalCoinPayments}</span>
                </div>
            </div>
        `
        
    } catch (error) {
        console.error('Statistika yuklashda xatolik:', error)
        showNotification('Statistika yuklashda xatolik yuz berdi', 'error')
    }
}

// Update connection status
function updateConnectionStatus() {
    firebaseManager.updateConnectionStatus()
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer')
    const id = Date.now().toString()
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    }
    
    const notification = document.createElement('div')
    notification.id = `notification-${id}`
    notification.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg notification-enter max-w-sm`
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-sm font-medium">${message}</span>
            <button onclick="removeNotification('${id}')" class="ml-3 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `
    
    container.appendChild(notification)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(id)
    }, 5000)
}

// Remove notification
function removeNotification(id) {
    const notification = document.getElementById(`notification-${id}`)
    if (notification) {
        notification.style.transform = 'translateX(100%)'
        notification.style.opacity = '0'
        setTimeout(() => {
            notification.remove()
        }, 300)
    }
}

// Logout
function logout() {
    if (confirm('Tizimdan chiqishni tasdiqlaysizmi?')) {
        sessionStorage.removeItem('currentUser')
        window.location.href = 'index.html'
    }
}

// Make functions global
window.showTab = showTab
window.showEditStudentModal = showEditStudentModal
window.closeEditStudentModal = closeEditStudentModal
window.updateStudent = updateStudent
window.showAddCoinsModal = showAddCoinsModal
window.closeAddCoinsModal = closeAddCoinsModal
window.showRemoveCoinsModal = showRemoveCoinsModal
window.closeRemoveCoinsModal = closeRemoveCoinsModal
window.addCoinsToStudent = addCoinsToStudent
window.removeCoinsFromStudent = removeCoinsFromStudent
window.showGroupStudents = showGroupStudents
window.closeGroupStudentsModal = closeGroupStudentsModal
window.showCreateGroupModal = showCreateGroupModal
window.closeCreateGroupModal = closeCreateGroupModal
window.createGroup = createGroup
window.deleteTask = deleteTask
window.showTaskSubmissions = showTaskSubmissions
window.gradeSubmission = gradeSubmission
window.closeSubmissionsModal = closeSubmissionsModal
window.showCreateTaskModal = showCreateTaskModal
window.closeCreateTaskModal = closeCreateTaskModal
window.handleAssignmentTypeChange = handleAssignmentTypeChange
window.createTask = createTask
window.deleteTest = deleteTest
window.showCreateTestModal = showCreateTestModal
window.closeCreateTestModal = closeCreateTestModal
window.addQuestion = addQuestion
window.removeQuestion = removeQuestion
window.createTest = createTest
window.deleteProject = deleteProject
window.showProjectSubmissions = showProjectSubmissions
window.approveProjectSubmission = approveProjectSubmission
window.rejectProjectSubmission = rejectProjectSubmission
window.showCreateProjectModal = showCreateProjectModal
window.closeCreateProjectModal = closeCreateProjectModal
window.createProject = createProject
window.markGroupAttendance = markGroupAttendance
window.confirmPayment = confirmPayment
window.approveWithdrawal = approveWithdrawal
window.rejectWithdrawal = rejectWithdrawal
window.showCreatePaymentModal = showCreatePaymentModal
window.closeCreatePaymentModal = closeCreatePaymentModal
window.createPayment = createPayment
window.approveReferral = approveReferral
window.rejectReferral = rejectReferral
window.removeNotification = removeNotification
window.logout = logout