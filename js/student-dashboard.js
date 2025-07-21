import { firebaseManager } from './firebase.js'

// Global variables
let currentUser = null
let currentTab = 'dashboard'
let currentTask = null
let currentTest = null
let currentProject = null
let testAnswers = []
let submissionType = 'code'

// Initialize the dashboard
async function initializeDashboard() {
    console.log('Initializing student dashboard...')
    
    try {
        // Get current user from session storage
        const userString = sessionStorage.getItem('currentUser')
        if (!userString) {
            console.log('No user found in session, redirecting to login')
            window.location.href = 'index.html'
            return
        }

        currentUser = JSON.parse(userString)
        console.log('Current user:', currentUser)

        // Update UI with user info
        updateUserInfo()
        
        // Load dashboard data
        await loadDashboardData()
        
        // Setup real-time listeners
        setupRealTimeListeners()
        
        console.log('Dashboard initialized successfully')
    } catch (error) {
        console.error('Error initializing dashboard:', error)
        showNotification('Ma\'lumotlarni yuklashda xatolik yuz berdi', 'error')
    }
}

// Update user info in UI
function updateUserInfo() {
    if (!currentUser) return

    console.log('Updating user info in UI')
    
    // Update user name and initials
    const nameElement = document.getElementById('studentName')
    const initialsElement = document.getElementById('userInitials')
    
    if (nameElement) nameElement.textContent = currentUser.name || 'O\'quvchi'
    if (initialsElement) {
        const initials = (currentUser.name || 'O').split(' ').map(n => n[0]).join('').toUpperCase()
        initialsElement.textContent = initials
    }

    // Update rating and balance
    updateRatingAndBalance()
}

// Update rating and balance
function updateRatingAndBalance() {
    if (!currentUser) return

    const rating = currentUser.rating || 0
    const balance = Math.floor(rating * 10) // 1 coin = 10 so'm

    console.log('Updating rating and balance:', { rating, balance })

    // Update sidebar
    const ratingElement = document.getElementById('studentRating')
    const balanceElement = document.getElementById('studentBalance')
    
    if (ratingElement) ratingElement.textContent = `${rating.toLocaleString()} coin`
    if (balanceElement) balanceElement.textContent = `${balance.toLocaleString()} so'm`

    // Update dashboard cards
    const dashboardCoins = document.getElementById('dashboardCoins')
    const dashboardBalance = document.getElementById('dashboardBalance')
    
    if (dashboardCoins) dashboardCoins.textContent = rating.toLocaleString()
    if (dashboardBalance) dashboardBalance.textContent = `${balance.toLocaleString()} so'm`

    // Update wallet
    const walletCoins = document.getElementById('walletCoins')
    const walletBalance = document.getElementById('walletBalance')
    
    if (walletCoins) walletCoins.textContent = `${rating.toLocaleString()} coin`
    if (walletBalance) walletBalance.textContent = `${balance.toLocaleString()} so'm`
}

// Load dashboard data
async function loadDashboardData() {
    console.log('Loading dashboard data...')
    
    try {
        // Show skeleton loaders
        showAllSkeletonLoaders()
        
        // Load all data in parallel
        const [
            tasks,
            tests,
            projects,
            leaderboard,
            paymentHistory,
            chatMessages,
            notifications,
            groups
        ] = await Promise.all([
            firebaseManager.getArrayData('tasks'),
            firebaseManager.getArrayData('tests'),
            firebaseManager.getArrayData('projects'),
            firebaseManager.getArrayData('users'),
            firebaseManager.getArrayData('paymentTransactions'),
            firebaseManager.getArrayData('chatMessages'),
            firebaseManager.getArrayData('notifications'),
            firebaseManager.getArrayData('groups')
        ])

        console.log('Data loaded:', {
            tasks: tasks.length,
            tests: tests.length,
            projects: projects.length,
            users: leaderboard.length,
            transactions: paymentHistory.length,
            messages: chatMessages.length,
            notifications: notifications.length,
            groups: groups.length
        })

        // Update current user data
        const updatedUser = leaderboard.find(u => u.id === currentUser.id)
        if (updatedUser) {
            currentUser = updatedUser
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser))
            updateUserInfo()
        }

        // Load content for current tab
        await loadTabContent(currentTab, {
            tasks,
            tests,
            projects,
            leaderboard,
            paymentHistory,
            chatMessages,
            notifications,
            groups
        })

        // Check payment status
        checkPaymentStatus()
        
        // Hide skeleton loaders
        hideAllSkeletonLoaders()
        
        console.log('Dashboard data loaded successfully')
    } catch (error) {
        console.error('Error loading dashboard data:', error)
        hideAllSkeletonLoaders()
        showErrorState()
    }
}

// Show all skeleton loaders
function showAllSkeletonLoaders() {
    const loaders = [
        'tasksSkeletonLoader',
        'testsSkeletonLoader', 
        'projectsSkeletonLoader',
        'leaderboardSkeletonLoader',
        'paymentHistorySkeletonLoader',
        'chatSkeletonLoader',
        'userInfoSkeletonLoader',
        'referralHistorySkeletonLoader',
        'groupInfoSkeletonLoader'
    ]
    
    loaders.forEach(loaderId => {
        const loader = document.getElementById(loaderId)
        if (loader) loader.classList.remove('hidden')
    })
}

// Hide all skeleton loaders
function hideAllSkeletonLoaders() {
    const loaders = [
        'tasksSkeletonLoader',
        'testsSkeletonLoader',
        'projectsSkeletonLoader', 
        'leaderboardSkeletonLoader',
        'paymentHistorySkeletonLoader',
        'chatSkeletonLoader',
        'userInfoSkeletonLoader',
        'referralHistorySkeletonLoader',
        'groupInfoSkeletonLoader'
    ]
    
    loaders.forEach(loaderId => {
        const loader = document.getElementById(loaderId)
        if (loader) loader.classList.add('hidden')
    })
}

// Show error state
function showErrorState() {
    const containers = ['tasksList', 'testsList', 'projectsList', 'leaderboardList', 'paymentHistory', 'chatMessages']
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId)
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <p class="text-gray-600 mb-4">Ma'lumotlarni yuklashda xatolik yuz berdi</p>
                    <button onclick="loadDashboardData()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Qayta urinish
                    </button>
                </div>
            `
        }
    })
}

// Load content for specific tab
async function loadTabContent(tab, data) {
    console.log(`Loading content for tab: ${tab}`)
    
    switch (tab) {
        case 'dashboard':
            await loadRecentActivity(data.paymentHistory)
            break
        case 'tasks':
            await loadTasks(data.tasks)
            break
        case 'tests':
            await loadTests(data.tests)
            break
        case 'projects':
            await loadProjects(data.projects)
            break
        case 'leaderboard':
            await loadLeaderboard(data.leaderboard)
            break
        case 'wallet':
            await loadPaymentHistory(data.paymentHistory)
            break
        case 'chat':
            await loadChatMessages(data.chatMessages)
            break
        case 'about':
            await loadUserInfo(data.groups)
            break
    }
}

// Check payment status
function checkPaymentStatus() {
    if (!currentUser) return

    console.log('Checking payment status:', currentUser.paymentStatus)
    
    const paymentCard = document.getElementById('paymentStatusCard')
    if (!paymentCard) return

    if (currentUser.paymentStatus === 'unpaid' || currentUser.paymentStatus === 'partial') {
        paymentCard.classList.remove('hidden')
        
        const description = document.getElementById('paymentDescription')
        const amount = document.getElementById('paymentAmount')
        const dueDate = document.getElementById('paymentDueDate')
        const partialInfo = document.getElementById('partialPaymentInfo')
        const remainingAmount = document.getElementById('remainingAmount')
        
        if (description) description.textContent = currentUser.paymentDescription || 'Oylik to\'lov'
        if (amount) amount.textContent = `${(currentUser.paymentAmount || 0).toLocaleString()} so'm`
        if (dueDate && currentUser.paymentDueDate) {
            const date = new Date(currentUser.paymentDueDate)
            dueDate.textContent = `Muddat: ${date.toLocaleDateString('uz-UZ')}`
        }
        
        if (currentUser.paymentStatus === 'partial' && partialInfo && remainingAmount) {
            partialInfo.classList.remove('hidden')
            remainingAmount.textContent = `${(currentUser.paymentAmount || 0).toLocaleString()} so'm`
        }
    } else {
        paymentCard.classList.add('hidden')
    }
}

// Load recent activity
async function loadRecentActivity(transactions) {
    console.log('Loading recent activity...')
    
    const container = document.getElementById('recentActivity')
    if (!container) return

    const userTransactions = transactions
        .filter(t => t.studentId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5)

    if (userTransactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Hozircha faoliyat yo\'q</p>'
        return
    }

    container.innerHTML = userTransactions.map(transaction => {
        const date = new Date(transaction.timestamp).toLocaleDateString('uz-UZ')
        const isPositive = transaction.amount > 0
        const icon = getTransactionIcon(transaction.type)
        
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center">
                        <i class="fas ${icon} text-sm"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${transaction.description}</p>
                        <p class="text-xs text-gray-500">${date}</p>
                    </div>
                </div>
                <span class="text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    ${isPositive ? '+' : ''}${transaction.amount.toLocaleString()} coin
                </span>
            </div>
        `
    }).join('')
}

// Get transaction icon
function getTransactionIcon(type) {
    switch (type) {
        case 'earning': return 'fa-plus'
        case 'payment': return 'fa-minus'
        case 'withdrawal': return 'fa-money-bill-wave'
        case 'fine': return 'fa-exclamation-triangle'
        default: return 'fa-exchange-alt'
    }
}

// Load tasks
async function loadTasks(tasks) {
    console.log('Loading tasks...')
    
    const container = document.getElementById('tasksList')
    if (!container) return

    // Filter tasks for current user
    const userTasks = tasks.filter(task => {
        if (task.assignedStudents && task.assignedStudents.length > 0) {
            return task.assignedStudents.includes(currentUser.id)
        }
        if (task.groupId && currentUser.groupId) {
            return task.groupId === currentUser.groupId
        }
        return !task.groupId && !task.assignedStudents
    }).filter(task => task.status === 'active')

    if (userTasks.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha vazifa yo\'q</p>'
        return
    }

    container.innerHTML = userTasks.map(task => {
        const deadline = new Date(task.deadline)
        const isExpired = deadline < new Date()
        const timeLeft = getTimeLeft(deadline)
        
        return `
            <div class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow ${isExpired ? 'task-expired' : ''}">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-semibold text-gray-800">${task.title}</h3>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${task.reward} coin</span>
                </div>
                <p class="text-gray-600 text-sm mb-3">${task.description}</p>
                <div class="flex items-center justify-between">
                    <div class="text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}">
                        <i class="fas fa-clock mr-1"></i>
                        ${isExpired ? 'Muddati o\'tgan!' : timeLeft}
                    </div>
                    <button onclick="openTaskModal('${task.id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Topshirish
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// Load tests
async function loadTests(tests) {
    console.log('Loading tests...')
    
    const container = document.getElementById('testsList')
    if (!container) return

    // Filter tests for current user
    const userTests = tests.filter(test => {
        if (test.assignedStudents && test.assignedStudents.length > 0) {
            return test.assignedStudents.includes(currentUser.id)
        }
        if (test.groupId && currentUser.groupId) {
            return test.groupId === currentUser.groupId
        }
        return !test.groupId && !test.assignedStudents
    }).filter(test => test.status === 'active')

    if (userTests.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha test yo\'q</p>'
        return
    }

    container.innerHTML = userTests.map(test => `
        <div class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-3">
                <h3 class="font-semibold text-gray-800">${test.title}</h3>
                <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">${test.questions.length} savol</span>
            </div>
            <p class="text-gray-600 text-sm mb-3">${test.description}</p>
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    <i class="fas fa-clock mr-1"></i>
                    ${test.timeLimit} daqiqa
                </div>
                <button onclick="openTestModal('${test.id}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Boshlash
                </button>
            </div>
        </div>
    `).join('')
}

// Load projects
async function loadProjects(projects) {
    console.log('Loading projects...')
    
    const container = document.getElementById('projectsList')
    if (!container) return

    // Filter projects for current user
    const userProjects = projects.filter(project => {
        if (project.assignedStudents && project.assignedStudents.length > 0) {
            return project.assignedStudents.includes(currentUser.id)
        }
        if (project.groupId && currentUser.groupId) {
            return project.groupId === currentUser.groupId
        }
        return !project.groupId && !project.assignedStudents
    }).filter(project => project.status === 'active')

    if (userProjects.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Hozircha loyiha yo\'q</p>'
        return
    }

    container.innerHTML = userProjects.map(project => {
        const deadline = new Date(project.deadline)
        const isExpired = deadline < new Date()
        const timeLeft = getTimeLeft(deadline)
        
        return `
            <div class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow ${isExpired ? 'task-expired' : ''}">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-semibold text-gray-800">${project.title}</h3>
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">${project.payment} coin</span>
                </div>
                <p class="text-gray-600 text-sm mb-3">${project.description}</p>
                <div class="flex items-center justify-between">
                    <div class="text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}">
                        <i class="fas fa-clock mr-1"></i>
                        ${isExpired ? 'Muddati o\'tgan!' : timeLeft}
                    </div>
                    <button onclick="openProjectModal('${project.id}')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                        Topshirish
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// Load leaderboard
async function loadLeaderboard(users) {
    console.log('Loading leaderboard...')
    
    const container = document.getElementById('leaderboardList')
    if (!container) return

    const students = users
        .filter(u => u.role === 'student')
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))

    if (students.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Reyting ma\'lumotlari yo\'q</p>'
        return
    }

    // Find current user rank
    const currentUserRank = students.findIndex(s => s.id === currentUser.id) + 1
    const rankElement = document.getElementById('dashboardRank')
    if (rankElement) {
        rankElement.textContent = currentUserRank > 0 ? `#${currentUserRank}` : '#-'
    }

    container.innerHTML = students.map((student, index) => {
        const rank = index + 1
        const isCurrentUser = student.id === currentUser.id
        const balance = Math.floor((student.rating || 0) * 10)
        
        return `
            <div class="flex items-center justify-between p-3 ${isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'} rounded-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 ${getRankColor(rank)} rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ${rank}
                    </div>
                    <div>
                        <p class="font-medium text-gray-800 ${isCurrentUser ? 'text-blue-800' : ''}">${student.name}</p>
                        <p class="text-xs text-gray-500">${balance.toLocaleString()} so'm</p>
                    </div>
                </div>
                <span class="font-semibold text-blue-600">${(student.rating || 0).toLocaleString()} coin</span>
            </div>
        `
    }).join('')
}

// Get rank color
function getRankColor(rank) {
    if (rank === 1) return 'bg-yellow-500'
    if (rank === 2) return 'bg-gray-400'
    if (rank === 3) return 'bg-orange-500'
    return 'bg-blue-500'
}

// Load payment history
async function loadPaymentHistory(transactions) {
    console.log('Loading payment history...')
    
    const container = document.getElementById('paymentHistory')
    if (!container) return

    const userTransactions = transactions
        .filter(t => t.studentId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    if (userTransactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">To\'lov tarixi yo\'q</p>'
        return
    }

    container.innerHTML = userTransactions.map(transaction => {
        const date = new Date(transaction.timestamp).toLocaleDateString('uz-UZ')
        const isPositive = transaction.amount > 0
        const icon = getTransactionIcon(transaction.type)
        
        return `
            <div class="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center">
                        <i class="fas ${icon} text-xs"></i>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-800">${transaction.description}</p>
                        <p class="text-xs text-gray-500">${date}</p>
                    </div>
                </div>
                <span class="text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    ${isPositive ? '+' : ''}${transaction.amount.toLocaleString()}
                </span>
            </div>
        `
    }).join('')
}

// Load chat messages
async function loadChatMessages(messages) {
    console.log('Loading chat messages...')
    
    const container = document.getElementById('chatMessages')
    if (!container) return

    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    if (sortedMessages.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Hozircha xabar yo\'q</p>'
        return
    }

    container.innerHTML = sortedMessages.map(message => {
        const time = new Date(message.timestamp).toLocaleTimeString('uz-UZ', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
        const isCurrentUser = message.studentId === currentUser.id
        
        return `
            <div class="flex items-start space-x-2 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-xs">${message.studentName.charAt(0)}</span>
                </div>
                <div class="flex-1 max-w-xs">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-xs font-medium text-gray-800">${message.studentName}</span>
                        <span class="text-xs text-gray-500">${time}</span>
                    </div>
                    <div class="bg-${isCurrentUser ? 'blue' : 'gray'}-100 rounded-lg p-2">
                        <p class="text-sm text-gray-800">${message.message}</p>
                        ${message.imageUrl ? `<img src="${message.imageUrl}" alt="Image" class="mt-2 max-w-full rounded">` : ''}
                    </div>
                </div>
            </div>
        `
    }).join('')

    // Scroll to bottom
    container.scrollTop = container.scrollHeight
}

// Load user info
async function loadUserInfo(groups) {
    console.log('Loading user info...')
    
    // Update user info
    const userName = document.getElementById('userName')
    const userEmail = document.getElementById('userEmail')
    const userReferralCode = document.getElementById('userReferralCode')
    const myReferralCode = document.getElementById('myReferralCode')
    
    if (userName) userName.textContent = currentUser.name || 'Noma\'lum'
    if (userEmail) userEmail.textContent = currentUser.email || 'Noma\'lum'
    if (userReferralCode) userReferralCode.textContent = currentUser.referralCode || 'Noma\'lum'
    if (myReferralCode) myReferralCode.textContent = currentUser.referralCode || 'Noma\'lum'

    // Load group info
    const groupInfoContainer = document.getElementById('groupInfo')
    if (groupInfoContainer && currentUser.groupId) {
        const group = groups.find(g => g.id === currentUser.groupId)
        if (group) {
            groupInfoContainer.innerHTML = `
                <div class="flex justify-between">
                    <span class="text-gray-600">Guruh nomi:</span>
                    <span class="font-medium text-gray-800">${group.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Tavsif:</span>
                    <span class="font-medium text-gray-800">${group.description || 'Tavsif yo\'q'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">O'quvchilar soni:</span>
                    <span class="font-medium text-gray-800">${group.studentCount || 0}</span>
                </div>
            `
        } else {
            groupInfoContainer.innerHTML = '<p class="text-gray-500">Guruhga biriktirilmagan</p>'
        }
    } else if (groupInfoContainer) {
        groupInfoContainer.innerHTML = '<p class="text-gray-500">Guruhga biriktirilmagan</p>'
    }
}

// Setup real-time listeners
function setupRealTimeListeners() {
    console.log('Setting up real-time listeners...')
    
    // Listen for user updates
    firebaseManager.listenToData(`users/${currentUser.id}`, (userData) => {
        if (userData) {
            currentUser = userData
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser))
            updateUserInfo()
            checkPaymentStatus()
        }
    })

    // Listen for notifications
    firebaseManager.listenToData('notifications', (notifications) => {
        if (notifications) {
            const userNotifications = Object.values(notifications)
                .filter(n => n.userId === currentUser.id && !n.read)
            
            updateNotificationBadge(userNotifications.length)
        }
    })
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge')
    if (badge) {
        if (count > 0) {
            badge.textContent = count
            badge.classList.remove('hidden')
        } else {
            badge.classList.add('hidden')
        }
    }
}

// Get time left
function getTimeLeft(deadline) {
    const now = new Date()
    const diff = deadline - now
    
    if (diff <= 0) return 'Muddati o\'tgan!'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days} kun ${hours} soat`
    if (hours > 0) return `${hours} soat`
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${minutes} daqiqa`
}

// Tab management
window.showTab = function(tabName) {
    console.log(`Switching to tab: ${tabName}`)
    
    currentTab = tabName
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden')
    })
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Content`)
    if (selectedTab) {
        selectedTab.classList.remove('hidden')
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('text-blue-600', 'bg-blue-50')
        item.classList.add('text-gray-700')
    })
    
    const activeNavItem = document.querySelector(`[onclick="showTab('${tabName}')"]`)
    if (activeNavItem) {
        activeNavItem.classList.add('text-blue-600', 'bg-blue-50')
        activeNavItem.classList.remove('text-gray-700')
    }
    
    // Update page title
    const titles = {
        dashboard: 'Bosh sahifa',
        tasks: 'Vazifalar',
        tests: 'Testlar',
        projects: 'Loyihalar',
        leaderboard: 'Reyting',
        wallet: 'Hamyon',
        chat: 'Chat',
        about: 'Ma\'lumot'
    }
    
    const pageTitle = document.getElementById('pageTitle')
    if (pageTitle) {
        pageTitle.textContent = titles[tabName] || 'EduSystem'
    }
    
    // Load tab content if needed
    loadDashboardData()
}

// Task modal functions
window.openTaskModal = async function(taskId) {
    console.log('Opening task modal for:', taskId)
    
    try {
        const tasks = await firebaseManager.getArrayData('tasks')
        const task = tasks.find(t => t.id === taskId)
        
        if (!task) {
            showNotification('Vazifa topilmadi', 'error')
            return
        }
        
        currentTask = task
        
        document.getElementById('modalTaskTitle').textContent = task.title
        document.getElementById('modalTaskDescription').textContent = task.description
        document.getElementById('modalTaskDeadline').textContent = `Muddat: ${new Date(task.deadline).toLocaleDateString('uz-UZ')}`
        
        document.getElementById('taskModal').classList.remove('hidden')
        document.getElementById('taskModal').classList.add('flex')
    } catch (error) {
        console.error('Error opening task modal:', error)
        showNotification('Vazifani ochishda xatolik', 'error')
    }
}

window.closeTaskModal = function() {
    document.getElementById('taskModal').classList.add('hidden')
    document.getElementById('taskModal').classList.remove('flex')
    currentTask = null
}

window.showSubmissionType = function(type) {
    submissionType = type
    
    // Update buttons
    document.querySelectorAll('.submission-type').forEach(el => el.classList.add('hidden'))
    document.getElementById(`${type}Submission`).classList.remove('hidden')
    
    // Update button styles
    const buttons = document.querySelectorAll('[onclick^="showSubmissionType"]')
    buttons.forEach(btn => {
        btn.classList.remove('border-blue-500', 'bg-blue-50')
        btn.classList.add('border-gray-200')
    })
    
    const activeButton = document.querySelector(`[onclick="showSubmissionType('${type}')"]`)
    if (activeButton) {
        activeButton.classList.add('border-blue-500', 'bg-blue-50')
        activeButton.classList.remove('border-gray-200')
    }
}

window.submitTask = async function() {
    if (!currentTask) return
    
    try {
        let description = ''
        
        if (submissionType === 'code') {
            const html = document.getElementById('htmlCode').value.trim()
            const css = document.getElementById('cssCode').value.trim()
            const js = document.getElementById('jsCode').value.trim()
            
            if (!html && !css && !js) {
                showNotification('Kamida bitta kod maydonini to\'ldiring', 'error')
                return
            }
            
            description = `HTML:\n${html}\n\nCSS:\n${css}\n\nJavaScript:\n${js}`
        } else {
            const url = document.getElementById('taskWebsiteUrl').value.trim()
            if (!url) {
                showNotification('URL ni kiriting', 'error')
                return
            }
            description = `Website URL: ${url}`
        }
        
        await firebaseManager.submitTask(currentTask.id, currentUser.id, description)
        showNotification('Vazifa muvaffaqiyatli topshirildi!', 'success')
        closeTaskModal()
        loadDashboardData()
    } catch (error) {
        console.error('Error submitting task:', error)
        showNotification('Vazifa topshirishda xatolik', 'error')
    }
}

// Test modal functions
window.openTestModal = async function(testId) {
    console.log('Opening test modal for:', testId)
    
    try {
        const tests = await firebaseManager.getArrayData('tests')
        const test = tests.find(t => t.id === testId)
        
        if (!test) {
            showNotification('Test topilmadi', 'error')
            return
        }
        
        currentTest = test
        testAnswers = new Array(test.questions.length).fill('')
        
        document.getElementById('modalTestTitle').textContent = test.title
        
        const questionsContainer = document.getElementById('testQuestions')
        questionsContainer.innerHTML = test.questions.map((question, index) => `
            <div class="border border-gray-200 rounded-lg p-4">
                <h4 class="font-medium text-gray-800 mb-3">${index + 1}. ${question.question}</h4>
                <div class="space-y-2">
                    ${question.options.map((option, optionIndex) => `
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="question_${index}" value="${optionIndex}" 
                                   onchange="testAnswers[${index}] = ${optionIndex}" 
                                   class="text-blue-600 focus:ring-blue-500">
                            <span class="text-gray-700">${option}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('')
        
        document.getElementById('testModal').classList.remove('hidden')
        document.getElementById('testModal').classList.add('flex')
    } catch (error) {
        console.error('Error opening test modal:', error)
        showNotification('Testni ochishda xatolik', 'error')
    }
}

window.closeTestModal = function() {
    document.getElementById('testModal').classList.add('hidden')
    document.getElementById('testModal').classList.remove('flex')
    currentTest = null
    testAnswers = []
}

window.submitTest = async function() {
    if (!currentTest) return
    
    try {
        // Check if all questions are answered
        if (testAnswers.some(answer => answer === '')) {
            showNotification('Barcha savollarga javob bering', 'error')
            return
        }
        
        const result = await firebaseManager.submitTest(currentTest.id, currentUser.id, testAnswers)
        showNotification(`Test yakunlandi! Natija: ${result.score}%${result.reward > 0 ? `, ${result.reward} coin olindingiz!` : ''}`, 'success')
        closeTestModal()
        loadDashboardData()
    } catch (error) {
        console.error('Error submitting test:', error)
        showNotification('Test topshirishda xatolik', 'error')
    }
}

// Project modal functions
window.openProjectModal = async function(projectId) {
    console.log('Opening project modal for:', projectId)
    
    try {
        const projects = await firebaseManager.getArrayData('projects')
        const project = projects.find(p => p.id === projectId)
        
        if (!project) {
            showNotification('Loyiha topilmadi', 'error')
            return
        }
        
        currentProject = project
        
        document.getElementById('projectModalTitle').textContent = project.title
        document.getElementById('projectModal').classList.remove('hidden')
        document.getElementById('projectModal').classList.add('flex')
    } catch (error) {
        console.error('Error opening project modal:', error)
        showNotification('Loyihani ochishda xatolik', 'error')
    }
}

window.closeProjectModal = function() {
    document.getElementById('projectModal').classList.add('hidden')
    document.getElementById('projectModal').classList.remove('flex')
    currentProject = null
}

window.submitProjectUrl = async function() {
    if (!currentProject) return
    
    try {
        const url = document.getElementById('projectUrl').value.trim()
        if (!url) {
            showNotification('URL ni kiriting', 'error')
            return
        }
        
        await firebaseManager.submitProject(currentProject.id, currentUser.id, `Project URL: ${url}`)
        showNotification('Loyiha muvaffaqiyatli topshirildi!', 'success')
        closeProjectModal()
        loadDashboardData()
    } catch (error) {
        console.error('Error submitting project:', error)
        showNotification('Loyiha topshirishda xatolik', 'error')
    }
}

// Payment functions
window.payWithCoins = async function() {
    if (!currentUser.currentPaymentId) {
        showNotification('To\'lov ma\'lumotlari topilmadi', 'error')
        return
    }
    
    try {
        await firebaseManager.payWithCoins(currentUser.id, currentUser.currentPaymentId)
        showNotification('To\'lov muvaffaqiyatli amalga oshirildi!', 'success')
        loadDashboardData()
    } catch (error) {
        console.error('Error paying with coins:', error)
        showNotification(error.message || 'To\'lovda xatolik', 'error')
    }
}

window.payPartialWithCoins = async function() {
    if (!currentUser.currentPaymentId) {
        showNotification('To\'lov ma\'lumotlari topilmadi', 'error')
        return
    }
    
    try {
        const amountInput = document.getElementById('partialPaymentAmount') || document.getElementById('partialPaymentAmountDesktop')
        const amount = parseInt(amountInput.value)
        
        if (!amount || amount <= 0) {
            showNotification('To\'g\'ri miqdor kiriting', 'error')
            return
        }
        
        if (amount > currentUser.paymentAmount) {
            showNotification('Miqdor to\'lov summasidan oshmasligi kerak', 'error')
            return
        }
        
        await firebaseManager.payWithCoins(currentUser.id, currentUser.currentPaymentId, amount)
        showNotification('Qisman to\'lov muvaffaqiyatli amalga oshirildi!', 'success')
        amountInput.value = ''
        loadDashboardData()
    } catch (error) {
        console.error('Error paying partial with coins:', error)
        showNotification(error.message || 'To\'lovda xatolik', 'error')
    }
}

// Withdrawal functions
window.showWithdrawalModal = function() {
    if (!currentUser.canWithdraw) {
        showNotification('Oylik to\'lovni to\'lamaguningizcha pul yecha olmaysiz', 'error')
        return
    }
    
    document.getElementById('withdrawalModal').classList.remove('hidden')
    document.getElementById('withdrawalModal').classList.add('flex')
}

window.closeWithdrawalModal = function() {
    document.getElementById('withdrawalModal').classList.add('hidden')
    document.getElementById('withdrawalModal').classList.remove('flex')
}

window.submitWithdrawal = async function() {
    try {
        const coins = parseInt(document.getElementById('withdrawalCoins').value)
        const method = document.getElementById('withdrawalMethod').value
        const cardNumber = document.getElementById('withdrawalCardNumber').value.trim()
        const password = document.getElementById('withdrawalPassword').value.trim()
        
        if (!coins || coins < 10000) {
            showNotification('Minimal yechish miqdori 10,000 coin', 'error')
            return
        }
        
        if (!cardNumber) {
            showNotification('Karta raqamini kiriting', 'error')
            return
        }
        
        if (!password) {
            showNotification('Parolni kiriting', 'error')
            return
        }
        
        await firebaseManager.requestWithdrawal(currentUser.id, coins, cardNumber, method, password)
        showNotification('Pul yechish so\'rovi yuborildi!', 'success')
        closeWithdrawalModal()
        
        // Clear form
        document.getElementById('withdrawalCoins').value = ''
        document.getElementById('withdrawalCardNumber').value = ''
        document.getElementById('withdrawalPassword').value = ''
    } catch (error) {
        console.error('Error submitting withdrawal:', error)
        showNotification(error.message || 'Pul yechish so\'rovida xatolik', 'error')
    }
}

// Chat functions
window.sendMessage = async function() {
    const input = document.getElementById('chatInput')
    const message = input.value.trim()
    
    if (!message) return
    
    try {
        await firebaseManager.sendChatMessage(currentUser.id, message)
        input.value = ''
        loadDashboardData()
    } catch (error) {
        console.error('Error sending message:', error)
        showNotification('Xabar yuborishda xatolik', 'error')
    }
}

// Utility functions
window.copyReferralCode = function() {
    const code = currentUser.referralCode
    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Referal kod nusxalandi!', 'success')
        })
    }
}

window.logout = function() {
    sessionStorage.removeItem('currentUser')
    window.location.href = 'index.html'
}

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer')
    if (!container) return
    
    const notification = document.createElement('div')
    notification.className = `notification-enter p-4 rounded-lg shadow-lg text-white max-w-sm ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-sm font-medium">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `
    
    container.appendChild(notification)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove()
        }
    }, 5000)
}

// Update withdrawal amount calculation
document.addEventListener('DOMContentLoaded', function() {
    const withdrawalInputs = ['withdrawalCoins']
    
    withdrawalInputs.forEach(inputId => {
        const input = document.getElementById(inputId)
        if (input) {
            input.addEventListener('input', function() {
                const coins = parseInt(this.value) || 0
                const amount = coins * 10
                const amountElement = document.getElementById('withdrawalAmount')
                if (amountElement) {
                    amountElement.textContent = `${amount.toLocaleString()} so'm`
                }
            })
        }
    })
})

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard)

// Export functions for global access
window.showTab = window.showTab
window.openTaskModal = window.openTaskModal
window.closeTaskModal = window.closeTaskModal
window.showSubmissionType = window.showSubmissionType
window.submitTask = window.submitTask
window.openTestModal = window.openTestModal
window.closeTestModal = window.closeTestModal
window.submitTest = window.submitTest
window.openProjectModal = window.openProjectModal
window.closeProjectModal = window.closeProjectModal
window.submitProjectUrl = window.submitProjectUrl
window.payWithCoins = window.payWithCoins
window.payPartialWithCoins = window.payPartialWithCoins
window.showWithdrawalModal = window.showWithdrawalModal
window.closeWithdrawalModal = window.closeWithdrawalModal
window.submitWithdrawal = window.submitWithdrawal
window.sendMessage = window.sendMessage
window.copyReferralCode = window.copyReferralCode
window.logout = window.logout