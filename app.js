document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const formContainer = document.getElementById('form-container');
    const birthdayForm = document.getElementById('birthday-form');
    const addBirthdayBtn = document.getElementById('add-birthday-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const cardsContainer = document.getElementById('cards-container');
    const sortBySelect = document.getElementById('sort-by');
    const themeToggle = document.getElementById('theme-toggle');
    const notificationBanner = document.getElementById('notification-banner');
    const notificationContent = document.querySelector('.notification-content');
    const closeNotificationBtn = document.querySelector('.close-notification');
    const formTitle = document.getElementById('form-title');
    
    // State
    let birthdays = [];
    let isEditing = false;
    let currentEditId = null;
    
    // Initialize the app
    init();
    
    function init() {
        // Load saved birthdays with loading animation
        gsap.from(cardsContainer, { opacity: 0, y: 20, duration: 0.5 });
        loadBirthdays();
        
        // Set up event listeners
        setupEventListeners();
        
        // Check for notifications to show
        checkForNotifications();
        
        // Set up periodic checks for notifications (every hour)
        setInterval(checkForNotifications, 60 * 60 * 1000);
        
        // Ask for notification permission on first visit
        if (!localStorage.getItem('notificationPermissionAsked')) {
            askNotificationPermission();
            localStorage.setItem('notificationPermissionAsked', 'true');
        }
        
        // Set initial theme based on preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark || localStorage.getItem('theme') === 'dark') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }
    
    function setupEventListeners() {
        // Form submission
        birthdayForm.addEventListener('submit', handleFormSubmit);
        
        // Add birthday button with animation
        addBirthdayBtn.addEventListener('click', () => {
            isEditing = false;
            currentEditId = null;
            birthdayForm.reset();
            formTitle.textContent = 'Add New Birthday';
            showForm();
            
            // Animate the floating button
            gsap.to(addBirthdayBtn, {
                scale: 0.9,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', hideForm);
        
        // Sort by select
        sortBySelect.addEventListener('change', renderBirthdayCards);
        
        // Theme toggle with animation
        themeToggle.addEventListener('click', () => {
            gsap.to(themeToggle, {
                scale: 0.8,
                duration: 0.2,
                yoyo: true,
                repeat: 1,
                onComplete: toggleTheme
            });
        });
        
        // Close notification
        closeNotificationBtn.addEventListener('click', () => {
            hideNotification();
        });
        
        // Hide form when clicking outside
        document.addEventListener('click', (e) => {
            if (!formContainer.contains(e.target) && 
                e.target !== addBirthdayBtn && 
                !e.target.closest('.birthday-card')) {
                hideForm();
            }
        });
    }
    
    function loadBirthdays() {
        const savedBirthdays = localStorage.getItem('birthdays');
        if (savedBirthdays) {
            birthdays = JSON.parse(savedBirthdays);
            renderBirthdayCards();
        } else {
            // Show empty state with animation
            showEmptyState();
        }
    }
    
    function saveBirthdays() {
        localStorage.setItem('birthdays', JSON.stringify(birthdays));
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('name');
        const birthdateInput = document.getElementById('birthdate');
        
        const name = nameInput.value.trim();
        const birthdate = birthdateInput.value;
        
        // Validate inputs
        if (!name || !birthdate) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // Validate date (not in the future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(birthdate);
        
        if (selectedDate > today) {
            showNotification('Birthdate cannot be in the future', 'error');
            return;
        }
        
        const birthdayData = {
            id: isEditing ? currentEditId : Date.now().toString(),
            name,
            birthdate
        };
        
        if (isEditing) {
            // Update existing birthday
            const index = birthdays.findIndex(b => b.id === currentEditId);
            if (index !== -1) {
                birthdays[index] = birthdayData;
                showNotification('Birthday updated successfully', 'success');
                
                // Animate the edited card
                const editedCard = document.querySelector(`.birthday-card[data-id="${currentEditId}"]`);
                if (editedCard) {
                    gsap.to(editedCard, {
                        backgroundColor: 'rgba(0, 206, 201, 0.2)',
                        duration: 0.5,
                        yoyo: true,
                        repeat: 1
                    });
                }
            }
        } else {
            // Add new birthday with animation
            birthdays.push(birthdayData);
            showNotification('Birthday added successfully', 'success');
            
            // Animate the add button
            gsap.to(addBirthdayBtn, {
                scale: 1.1,
                duration: 0.3,
                yoyo: true,
                repeat: 1
            });
        }
        
        saveBirthdays();
        renderBirthdayCards();
        hideForm();
        checkForNotifications();
    }
    
    function renderBirthdayCards() {
        if (birthdays.length === 0) {
            showEmptyState();
            return;
        }
        
        // Sort birthdays
        const sortBy = sortBySelect.value;
        const sortedBirthdays = [...birthdays];
        
        sortedBirthdays.sort((a, b) => {
            const dateA = new Date(a.birthdate);
            const dateB = new Date(b.birthdate);
            
            // Adjust dates to current year for comparison
            const now = new Date();
            const currentYear = now.getFullYear();
            
            dateA.setFullYear(currentYear);
            dateB.setFullYear(currentYear);
            
            // If the date has already passed this year, use next year
            if (dateA < now) dateA.setFullYear(currentYear + 1);
            if (dateB < now) dateB.setFullYear(currentYear + 1);
            
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'days') {
                const daysLeftA = Math.ceil((dateA - now) / (1000 * 60 * 60 * 24));
                const daysLeftB = Math.ceil((dateB - now) / (1000 * 60 * 60 * 24));
                return daysLeftA - daysLeftB;
            } else {
                // Default sort by date (soonest first)
                return dateA - dateB;
            }
        });
        
        // Clear container with fade out animation
        gsap.to(cardsContainer.children, {
            opacity: 0,
            y: 20,
            duration: 0.2,
            stagger: 0.05,
            onComplete: () => {
                cardsContainer.innerHTML = '';
                addBirthdayCards(sortedBirthdays);
            }
        });
    }
    
    function addBirthdayCards(birthdaysArray) {
        birthdaysArray.forEach(birthday => {
            const card = createBirthdayCard(birthday);
            cardsContainer.appendChild(card);
            
            // Animate card entrance with stagger
            gsap.from(card, {
                opacity: 0,
                y: 20,
                duration: 0.4,
                delay: 0.05 * birthdaysArray.indexOf(birthday),
                ease: 'back.out(1)'
            });
        });
    }
    
    function createBirthdayCard(birthday) {
        const { id, name, birthdate } = birthday;
        
        // Calculate age and days left
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const birthDate = new Date(birthdate);
        const nextBirthday = new Date(birthDate);
        nextBirthday.setFullYear(today.getFullYear());
        
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const age = nextBirthday.getFullYear() - birthDate.getFullYear();
        const daysLeft = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        
        // Format date
        const options = { month: 'long', day: 'numeric' };
        const formattedDate = new Date(birthdate).toLocaleDateString(undefined, options);
        
        // Create card
        const card = document.createElement('div');
        card.className = 'birthday-card';
        card.setAttribute('data-id', id);
        if (daysLeft <= 7) {
            card.classList.add('soon');
        }
        
        card.innerHTML = `
            ${daysLeft <= 7 ? '<div class="soon-badge">Coming Soon!</div>' : ''}
            <h3>${name}</h3>
            <p>
                <span>Age on next birthday:</span>
                <span>${age}</span>
            </p>
            <p>
                <span>Birthday:</span>
                <span>${formattedDate}</span>
            </p>
            <p>
                <span>Days left:</span>
                <span>${daysLeft}</span>
            </p>
            <div class="card-actions">
                <button class="edit-btn" data-id="${id}" aria-label="Edit birthday">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" data-id="${id}" aria-label="Delete birthday">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add event listeners to action buttons
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editBirthday(id);
            
            // Button click animation
            gsap.to(e.currentTarget, {
                scale: 0.8,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        });
        
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Button click animation
            gsap.to(e.currentTarget, {
                scale: 0.8,
                duration: 0.2,
                yoyo: true,
                repeat: 1,
                onComplete: () => deleteBirthday(id)
            });
        });
        
        // Add hover animation
        card.addEventListener('mouseenter', () => {
            gsap.to(card, { 
                y: -5, 
                duration: 0.3,
                boxShadow: '0 15px 30px var(--shadow-color)'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { 
                y: 0, 
                duration: 0.3,
                boxShadow: '0 8px 32px var(--shadow-color)'
            });
        });
        
        // Add click animation
        card.addEventListener('click', () => {
            gsap.to(card, {
                scale: 0.98,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        });
        
        return card;
    }
    
    function showEmptyState() {
        cardsContainer.innerHTML = `
            <div class="empty-state glass-card">
                <i class="fas fa-birthday-cake"></i>
                <h3>No Birthdays Yet</h3>
                <p>Add your first birthday reminder to get started</p>
            </div>
        `;
        
        // Animate empty state
        gsap.from('.empty-state', {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: 'back.out(1)'
        });
    }
    
    function editBirthday(id) {
        const birthdayToEdit = birthdays.find(b => b.id === id);
        if (!birthdayToEdit) return;
        
        isEditing = true;
        currentEditId = id;
        
        document.getElementById('name').value = birthdayToEdit.name;
        document.getElementById('birthdate').value = birthdayToEdit.birthdate;
        formTitle.textContent = 'Edit Birthday';
        
        showForm();
    }
    
    function deleteBirthday(id) {
        // Show confirmation with animation
        const cardToDelete = document.querySelector(`.birthday-card[data-id="${id}"]`);
        if (cardToDelete) {
            gsap.to(cardToDelete, {
                opacity: 0,
                x: 50,
                height: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginBottom: 0,
                duration: 0.3,
                onComplete: () => {
                    birthdays = birthdays.filter(b => b.id !== id);
                    saveBirthdays();
                    renderBirthdayCards();
                    showNotification('Birthday deleted', 'success');
                    checkForNotifications();
                }
            });
        }
    }
    
    function showForm() {
        formContainer.classList.add('active');
        
        // Animate form appearance
        gsap.from('.birthday-form', {
            y: 20,
            opacity: 0,
            duration: 0.4,
            ease: 'back.out(1.2)'
        });
        
        // Focus on name field
        setTimeout(() => {
            document.getElementById('name').focus();
        }, 100);
    }
    
    function hideForm() {
        // Animate form disappearance
        gsap.to('.birthday-form', {
            y: 20,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                formContainer.classList.remove('active');
                birthdayForm.reset();
            }
        });
    }
    
    function checkForNotifications() {
        if (!('Notification' in window)) return;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekFromNow = new Date(today);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        const oneDayFromNow = new Date(today);
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        
        birthdays.forEach(birthday => {
            const birthDate = new Date(birthday.birthdate);
            const nextBirthday = new Date(birthDate);
            nextBirthday.setFullYear(today.getFullYear());
            
            if (nextBirthday < today) {
                nextBirthday.setFullYear(today.getFullYear() + 1);
            }
            
            // Check if birthday is in one week
            const oneWeekBefore = new Date(nextBirthday);
            oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
            
            // Check if birthday is tomorrow
            const oneDayBefore = new Date(nextBirthday);
            oneDayBefore.setDate(oneDayBefore.getDate() - 1);
            
            // Check if we should show 1 week notification
            if (isSameDate(oneWeekBefore, today)) {
                showWebNotification(`${birthday.name}'s birthday is in one week!`);
                showNotification(`${birthday.name}'s birthday is in one week!`, 'success');
            }
            
            // Check if we should show 1 day notification
            if (isSameDate(oneDayBefore, today)) {
                showWebNotification(`${birthday.name}'s birthday is tomorrow!`);
                showNotification(`${birthday.name}'s birthday is tomorrow!`, 'success');
            }
        });
    }
    
    function isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    function showWebNotification(message) {
        if (Notification.permission === 'granted') {
            new Notification('Birthday Reminder', {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png',
                vibrate: [200, 100, 200]
            });
        }
    }
    
    function askNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification('Notifications enabled! You\'ll get reminders for upcoming birthdays.', 'success');
                }
            });
        }
    }
    
    function showNotification(message, type) {
        notificationContent.textContent = message;
        notificationBanner.className = `notification-banner glass-card show ${type}`;
        
        // Animate notification
        gsap.from(notificationBanner, {
            y: 20,
            opacity: 0,
            duration: 0.4,
            ease: 'back.out(1)'
        });
        
        // Auto-hide after 5 seconds
        setTimeout(hideNotification, 5000);
    }
    
    function hideNotification() {
        gsap.to(notificationBanner, {
            y: 20,
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                notificationBanner.className = 'notification-banner glass-card';
            }
        });
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update icon with animation
        const icon = themeToggle.querySelector('i');
        gsap.to(icon, {
            rotate: 360,
            duration: 0.5,
            onComplete: () => {
                if (theme === 'dark') {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
                icon.style.transform = 'rotate(0)';
            }
        });
    }
});