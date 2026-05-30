/**
 * ============================================================
 * EHealth Hospital Management System - Core Application Logic
 * ============================================================
 * Features:
 *  - Multi-doctor authentication (each doctor sees only their own appointments)
 *  - Multi-patient registration & login
 *  - Doctor-specific appointment routing
 *  - Activity logging for every action
 *  - Google Sheets auto-sync
 * ============================================================
 */

// =============================================
// 1. DOCTOR DATABASE (Pre-registered doctors)
// =============================================
const doctorsDB = [
    { id: 'DOC-001', name: 'Dr. Sarah Ahmed',    email: 'dr.sarah@ehealth.com',  password: 'doc123', specialty: 'cardiology',   specialtyLabel: 'Cardiologist',       experience: '15 years', hospital: 'City Heart Hospital',     fee: 2500, avatar: '👩‍⚕️' },
    { id: 'DOC-002', name: 'Dr. Muhammad Khan',   email: 'dr.khan@ehealth.com',   password: 'doc123', specialty: 'neurology',    specialtyLabel: 'Neurologist',        experience: '12 years', hospital: 'National Medical Center', fee: 3000, avatar: '👨‍⚕️' },
    { id: 'DOC-003', name: 'Dr. Fatima Ali',      email: 'dr.fatima@ehealth.com', password: 'doc123', specialty: 'dermatology',  specialtyLabel: 'Dermatologist',      experience: '8 years',  hospital: 'Skin Care Clinic',        fee: 2000, avatar: '👩‍⚕️' },
    { id: 'DOC-004', name: 'Dr. Hassan Malik',    email: 'dr.hassan@ehealth.com', password: 'doc123', specialty: 'orthopedics',  specialtyLabel: 'Orthopedic Surgeon', experience: '20 years', hospital: 'Bone & Joint Hospital',   fee: 3500, avatar: '👨‍⚕️' },
    { id: 'DOC-005', name: 'Dr. Ayesha Rehman',   email: 'dr.ayesha@ehealth.com', password: 'doc123', specialty: 'pediatrics',   specialtyLabel: 'Pediatrician',       experience: '10 years', hospital: "Children's Hospital",     fee: 1800, avatar: '👩‍⚕️' },
];

// =============================================
// 2. DEFAULT PATIENT (for demo; more can register)
// =============================================
function getPatients() {
    let patients = JSON.parse(localStorage.getItem('ehealth_patients'));
    if (!patients || patients.length === 0) {
        patients = [
            { id: 'PAT-001', name: 'Alishba Khan', email: 'patient@demo.com', password: 'pat123', phone: '+92 300 1234567', role: 'patient', registeredAt: new Date().toISOString() }
        ];
        localStorage.setItem('ehealth_patients', JSON.stringify(patients));
    }
    return patients;
}

// =============================================
// 3. APPLICATION STATE
// =============================================
let currentUser   = JSON.parse(localStorage.getItem('ehealth_user')) || null;
let appointments  = JSON.parse(localStorage.getItem('ehealth_appointments')) || [];
let activityLogs  = JSON.parse(localStorage.getItem('ehealth_activity')) || [];
let selectedDoctor = null;
let currentLoginRole = 'patient'; // 'patient' or 'doctor'

// =============================================
// 4. INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
    setupEventListeners();
    setMinDate();
    lucide.createIcons();
});

// =============================================
// 5. SHOW / HIDE SCREENS
// =============================================
function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    lucide.createIcons();
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Display user info in header
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent = currentUser.role === 'doctor' ? `Doctor · ${currentUser.id}` : `Patient · ${currentUser.id}`;

    // Role-based visibility: hide "Doctors" nav for doctors
    if (currentUser.role === 'doctor') {
        document.querySelectorAll('.patient-only').forEach(el => el.classList.add('hidden'));
    } else {
        document.querySelectorAll('.patient-only').forEach(el => el.classList.remove('hidden'));
    }

    updateStats();
    renderDoctors(doctorsDB);
    renderAppointments();
    showPage('home');
    lucide.createIcons();
}

// =============================================
// 6. PAGE NAVIGATION
// =============================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(pageId);
    page.classList.remove('hidden');
    setTimeout(() => page.classList.add('active'), 10);

    const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
    if (btn) btn.classList.add('active');

    if (pageId === 'appointments') renderAppointments();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// 7. AUTHENTICATION - LOGIN
// =============================================
function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    let user = null;

    if (currentLoginRole === 'doctor') {
        // Search in doctorsDB
        const doc = doctorsDB.find(d => d.email === email && d.password === password);
        if (doc) {
            user = { id: doc.id, name: doc.name, email: doc.email, role: 'doctor', specialty: doc.specialtyLabel };
        }
    } else {
        // Search in patients (localStorage)
        const patients = getPatients();
        const pat = patients.find(p => p.email === email && p.password === password);
        if (pat) {
            user = { id: pat.id, name: pat.name, email: pat.email, phone: pat.phone, role: 'patient' };
        }
    }

    if (user) {
        user.loginTime = new Date().toISOString();
        currentUser = user;
        localStorage.setItem('ehealth_user', JSON.stringify(currentUser));
        logActivity('LOGIN', `${user.role} logged in`);
        showToast(`Welcome back, ${user.name}!`, 'success');
        showApp();
    } else {
        showToast('Invalid email or password. Please try again.', 'error');
    }
}

// =============================================
// 8. AUTHENTICATION - PATIENT REGISTRATION
// =============================================
function handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    const patients = getPatients();

    // Check if email already exists
    if (patients.find(p => p.email === email)) {
        showToast('This email is already registered. Please sign in.', 'error');
        return;
    }

    // Create new patient
    const newPatient = {
        id: 'PAT-' + String(patients.length + 1).padStart(3, '0'),
        name, email, password, phone,
        role: 'patient',
        registeredAt: new Date().toISOString()
    };

    patients.push(newPatient);
    localStorage.setItem('ehealth_patients', JSON.stringify(patients));

    // Sync new patient to Google Sheets
    syncToGoogleSheets({ sheet: 'Patients', ...newPatient });

    // Log activity
    logActivity('REGISTRATION', `New patient registered: ${name}`, null, newPatient);

    showToast('Account created! You can now sign in.', 'success');
    toggleRegister(); // Switch back to login form
    document.getElementById('registerForm').reset();
}

// Toggle between login and register forms
function toggleRegister() {
    const loginForm     = document.getElementById('loginForm');
    const registerForm  = document.getElementById('registerForm');
    const registerToggle = document.getElementById('registerToggle');

    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    registerToggle.classList.toggle('hidden');
    lucide.createIcons();
}

// =============================================
// 9. LOGOUT
// =============================================
function handleLogout() {
    logActivity('LOGOUT', `${currentUser.role} logged out`);
    localStorage.removeItem('ehealth_user');
    currentUser = null;
    showLogin();
    showToast('You have been logged out.', 'info');
}

// =============================================
// 10. LOGIN TAB SWITCHING
// =============================================
function setupEventListeners() {
    document.getElementById('patientLoginTab').addEventListener('click', () => {
        currentLoginRole = 'patient';
        updateLoginTabs();
    });
    document.getElementById('doctorLoginTab').addEventListener('click', () => {
        currentLoginRole = 'doctor';
        updateLoginTabs();
    });

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.page));
    });

    document.getElementById('searchDoctor').addEventListener('input', filterDoctors);
    document.getElementById('specialtyFilter').addEventListener('change', filterDoctors);
    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

function updateLoginTabs() {
    const pTab = document.getElementById('patientLoginTab');
    const dTab = document.getElementById('doctorLoginTab');
    const regToggle = document.getElementById('registerToggle');
    const regForm   = document.getElementById('registerForm');

    if (currentLoginRole === 'patient') {
        pTab.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-white shadow-sm text-primary-600';
        dTab.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700';
        regToggle.classList.remove('hidden');
    } else {
        dTab.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all bg-white shadow-sm text-primary-600';
        pTab.className = 'flex-1 py-3 text-sm font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700';
        // Hide registration for doctors
        regToggle.classList.add('hidden');
        regForm.classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    }
}

// =============================================
// 11. RENDER DOCTORS LIST (Patient view)
// =============================================
function renderDoctors(list) {
    const container = document.getElementById('doctorsList');
    if (!container) return;

    container.innerHTML = list.map(doc => `
        <div class="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary-100 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <div class="h-48 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-7xl">
                ${doc.avatar}
            </div>
            <div class="p-8">
                <h3 class="text-xl font-display font-bold text-slate-800">${doc.name}</h3>
                <p class="text-primary-600 font-bold text-xs uppercase tracking-widest mb-1">${doc.specialtyLabel}</p>
                <p class="text-[10px] text-slate-400 font-mono mb-4">${doc.id}</p>
                <div class="space-y-2 mb-6">
                    <p class="text-slate-500 text-xs flex items-center gap-2"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${doc.hospital}</p>
                    <p class="text-slate-500 text-xs flex items-center gap-2"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${doc.experience}</p>
                    <p class="text-slate-800 font-bold">Rs. ${doc.fee.toLocaleString()}</p>
                </div>
                <button onclick="openBookingModal('${doc.id}')" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-primary-500 transition-all active:scale-95">Book Now</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function filterDoctors() {
    const search    = document.getElementById('searchDoctor').value.toLowerCase();
    const specialty = document.getElementById('specialtyFilter').value;
    const filtered  = doctorsDB.filter(d =>
        (d.name.toLowerCase().includes(search) || d.hospital.toLowerCase().includes(search)) &&
        (!specialty || d.specialty === specialty)
    );
    renderDoctors(filtered);
}

// =============================================
// 12. BOOKING MODAL & APPOINTMENT CREATION
// =============================================
function openBookingModal(doctorId) {
    selectedDoctor = doctorsDB.find(d => d.id === doctorId);
    if (!selectedDoctor) return;

    document.getElementById('selectedDoctor').innerHTML = `
        <div class="text-3xl">${selectedDoctor.avatar}</div>
        <div>
            <p class="font-bold text-slate-800">${selectedDoctor.name}</p>
            <p class="text-xs text-slate-500">${selectedDoctor.specialtyLabel} · ${selectedDoctor.id}</p>
            <p class="text-xs font-bold text-primary-600 mt-1">Rs. ${selectedDoctor.fee.toLocaleString()}</p>
        </div>
    `;
    // Pre-fill patient name and phone
    document.getElementById('patientName').value = currentUser.name;
    document.getElementById('patientPhone').value = currentUser.phone || '';

    document.getElementById('bookingModal').classList.remove('hidden');
    document.getElementById('bookingModal').classList.add('flex');
    lucide.createIcons();
}

function closeModal() {
    document.getElementById('bookingModal').classList.add('hidden');
    document.getElementById('bookingModal').classList.remove('flex');
    document.getElementById('bookingForm').reset();
}

function handleBooking(e) {
    e.preventDefault();

    const appointment = {
        id:              'APT-' + Date.now(),
        // Patient details
        patientId:       currentUser.id,
        patientName:     document.getElementById('patientName').value,
        patientEmail:    currentUser.email,
        patientPhone:    document.getElementById('patientPhone').value,
        // Doctor details (links appointment to THIS specific doctor)
        doctorId:        selectedDoctor.id,
        doctorName:      selectedDoctor.name,
        doctorEmail:     selectedDoctor.email,
        doctorSpecialty: selectedDoctor.specialtyLabel,
        // Schedule
        date:            document.getElementById('appointmentDate').value,
        time:            document.getElementById('appointmentTime').value,
        fee:             selectedDoctor.fee,
        // Status
        status:          'pending',
        bookedAt:        new Date().toISOString()
    };

    // Save locally
    appointments.unshift(appointment);
    localStorage.setItem('ehealth_appointments', JSON.stringify(appointments));

    // Sync to Google Sheets
    syncToGoogleSheets({ sheet: 'Appointments', ...appointment });

    // Log this activity
    logActivity('APPOINTMENT_BOOKED', `${currentUser.name} booked with ${selectedDoctor.name}`, appointment.id);

    closeModal();
    showToast('Appointment Booked Successfully!', 'success');
    updateStats();
    showPage('appointments');
}

// =============================================
// 13. RENDER APPOINTMENTS (Role-filtered)
// =============================================
function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!currentUser) return;

    // KEY LOGIC: Filter appointments by role
    let userApts;
    if (currentUser.role === 'doctor') {
        // Doctor sees ONLY appointments assigned to them via doctorId
        userApts = appointments.filter(a => a.doctorId === currentUser.id);
    } else {
        // Patient sees ONLY their own appointments via patientEmail
        userApts = appointments.filter(a => a.patientEmail === currentUser.email);
    }

    // Update counters
    document.getElementById('totalAptCount').textContent   = userApts.length;
    document.getElementById('pendingAptCount').textContent  = userApts.filter(a => a.status === 'pending').length;

    if (userApts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><i data-lucide="calendar-x" class="w-8 h-8"></i></div>
                <p class="text-slate-400 font-medium">No appointments found.</p>
                ${currentUser.role === 'patient' ? '<button onclick="showPage(\'doctors\')" class="mt-4 text-primary-600 font-bold hover:underline">Book your first appointment →</button>' : ''}
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = userApts.map(apt => `
        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div class="flex items-center gap-6">
                <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-500">
                    <i data-lucide="calendar" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="font-display font-bold text-slate-800 text-lg">${currentUser.role === 'doctor' ? apt.patientName : apt.doctorName}</h3>
                    <p class="text-xs font-bold text-primary-500 uppercase tracking-widest">${currentUser.role === 'doctor' ? 'Patient · ' + apt.patientId : apt.doctorSpecialty + ' · ' + apt.doctorId}</p>
                    <div class="flex flex-wrap gap-4 mt-2 text-xs text-slate-400 font-medium">
                        <span class="flex items-center gap-1"><i data-lucide="calendar-days" class="w-3 h-3"></i> ${apt.date}</span>
                        <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${apt.time}</span>
                        <span class="flex items-center gap-1"><i data-lucide="hash" class="w-3 h-3"></i> ${apt.id}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4 flex-wrap">
                <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusClass(apt.status)}">
                    ${apt.status}
                </span>
                ${currentUser.role === 'doctor' && apt.status === 'pending' ? `
                    <div class="flex gap-2">
                        <button onclick="updateAptStatus('${apt.id}', 'accepted')" title="Accept" class="w-10 h-10 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center"><i data-lucide="check" class="w-5 h-5"></i></button>
                        <button onclick="updateAptStatus('${apt.id}', 'rejected')" title="Reject" class="w-10 h-10 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all flex items-center justify-center"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                ` : ''}
                ${currentUser.role === 'doctor' && apt.status === 'accepted' ? `
                    <button onclick="updateAptStatus('${apt.id}', 'completed')" title="Mark Completed" class="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">Complete</button>
                ` : ''}
                ${currentUser.role === 'patient' && apt.status === 'pending' ? `
                    <button onclick="updateAptStatus('${apt.id}', 'cancelled')" title="Cancel" class="px-4 py-2 bg-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-200 transition-all">Cancel</button>
                ` : ''}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// =============================================
// 14. UPDATE APPOINTMENT STATUS
// =============================================
function updateAptStatus(aptId, newStatus) {
    const index = appointments.findIndex(a => a.id === aptId);
    if (index === -1) return;

    appointments[index].status = newStatus;
    appointments[index].updatedAt = new Date().toISOString();
    localStorage.setItem('ehealth_appointments', JSON.stringify(appointments));

    // Log the activity
    const actionMap = {
        'accepted':  'APPOINTMENT_ACCEPTED',
        'rejected':  'APPOINTMENT_REJECTED',
        'completed': 'APPOINTMENT_COMPLETED',
        'cancelled': 'APPOINTMENT_CANCELLED'
    };
    logActivity(actionMap[newStatus] || 'STATUS_CHANGE', `Appointment ${aptId} marked as ${newStatus}`, aptId);

    // Sync update to Google Sheets
    syncToGoogleSheets({ sheet: 'Appointments', action: 'UPDATE', ...appointments[index] });

    renderAppointments();
    updateStats();
    showToast(`Appointment ${newStatus}`, newStatus === 'accepted' || newStatus === 'completed' ? 'success' : 'error');
}

// =============================================
// 15. STATUS BADGE STYLES
// =============================================
function getStatusClass(status) {
    const classes = {
        'pending':   'bg-amber-50 text-amber-600',
        'accepted':  'bg-emerald-50 text-emerald-600',
        'rejected':  'bg-rose-50 text-rose-600',
        'completed': 'bg-blue-50 text-blue-600',
        'cancelled': 'bg-slate-100 text-slate-500',
    };
    return classes[status] || 'bg-slate-50 text-slate-500';
}

// =============================================
// 16. DASHBOARD STATS
// =============================================
function updateStats() {
    if (!currentUser) return;

    let userApts;
    if (currentUser.role === 'doctor') {
        userApts = appointments.filter(a => a.doctorId === currentUser.id);
    } else {
        userApts = appointments.filter(a => a.patientEmail === currentUser.email);
    }

    document.getElementById('totalAptCount').textContent   = userApts.length;
    document.getElementById('pendingAptCount').textContent  = userApts.filter(a => a.status === 'pending').length;

    const grid = document.getElementById('statsGrid');
    if (!grid) return;

    const accepted  = userApts.filter(a => a.status === 'accepted').length;
    const completed = userApts.filter(a => a.status === 'completed').length;

    const stats = currentUser.role === 'doctor'
        ? [
            { label: 'My Patients',  val: userApts.length,  icon: 'users',      color: 'blue' },
            { label: 'Pending',      val: userApts.filter(a => a.status === 'pending').length, icon: 'clock', color: 'amber' },
            { label: 'Accepted',     val: accepted,         icon: 'check-circle', color: 'emerald' },
            { label: 'Completed',    val: completed,        icon: 'file-check',   color: 'purple' },
        ]
        : [
            { label: 'My Visits',    val: userApts.length,  icon: 'calendar',   color: 'blue' },
            { label: 'Pending',      val: userApts.filter(a => a.status === 'pending').length, icon: 'clock', color: 'amber' },
            { label: 'Specialists',  val: doctorsDB.length, icon: 'users',      color: 'purple' },
            { label: 'Completed',    val: completed,        icon: 'file-check', color: 'emerald' },
        ];

    grid.innerHTML = stats.map(s => `
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div class="w-12 h-12 bg-${s.color}-50 text-${s.color}-500 rounded-xl flex items-center justify-center mb-4">
                <i data-lucide="${s.icon}" class="w-6 h-6"></i>
            </div>
            <h4 class="text-2xl font-bold text-slate-800">${s.val}</h4>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">${s.label}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

// =============================================
// 17. ACTIVITY LOGGING
// =============================================
function logActivity(type, description, appointmentId = null, extraData = null) {
    const entry = {
        activityId:    'ACT-' + Date.now(),
        userRole:      currentUser ? currentUser.role : 'system',
        userName:      currentUser ? currentUser.name : 'System',
        userEmail:     currentUser ? currentUser.email : '',
        activityType:  type,
        description:   description,
        appointmentId: appointmentId || '',
        date:          new Date().toLocaleDateString(),
        time:          new Date().toLocaleTimeString(),
        timestamp:     new Date().toISOString(),
    };

    // Save locally
    activityLogs.unshift(entry);
    localStorage.setItem('ehealth_activity', JSON.stringify(activityLogs));

    // Sync to Google Sheets
    syncToGoogleSheets({ sheet: 'ActivityLogs', ...entry });
}

// =============================================
// 18. UTILITY FUNCTIONS
// =============================================
function setMinDate() {
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    }
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    const bgColor = type === 'error' ? 'bg-rose-600' : type === 'success' ? 'bg-emerald-600' : 'bg-slate-900';
    toast.textContent = msg;
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 ${bgColor} text-white rounded-2xl shadow-2xl transition-all duration-500 flex items-center gap-3 font-semibold`;
    // Remove hidden classes to show
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
}

// =============================================
// 19. GLOBAL EXPORTS (for onclick handlers)
// =============================================
window.handleLogout     = handleLogout;
window.showPage         = showPage;
window.openBookingModal = openBookingModal;
window.closeModal       = closeModal;
window.updateAptStatus  = updateAptStatus;
window.toggleRegister   = toggleRegister;
