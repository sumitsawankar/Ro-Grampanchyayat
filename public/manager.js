document.addEventListener('DOMContentLoaded', () => {
    // Auth Elements
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const viewLogin = document.getElementById('view-login');
    const viewManager = document.getElementById('view-manager');
    const btnLogout = document.getElementById('btn-logout');

    // Stats
    const statMembers = document.getElementById('stat-members');
    const statPending = document.getElementById('stat-pending');
    const statFulfilled = document.getElementById('stat-fulfilled');

    // Tabs & Contents
    const tabRequests = document.getElementById('tab-requests');
    const tabAddMember = document.getElementById('tab-add-member');
    const tabViewMembers = document.getElementById('tab-view-members');

    const contentRequests = document.getElementById('tab-content-requests');
    const contentAddMember = document.getElementById('tab-content-add-member');
    const contentViewMembers = document.getElementById('tab-content-view-members');

    // Tickets List Elements
    const ticketsBody = document.getElementById('tickets-body');
    const noTickets = document.getElementById('no-tickets');
    const statusFilter = document.getElementById('status-filter');
    const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // Member Registration Elements
    const addMemberForm = document.getElementById('add-member-form');
    const btnSaveMember = document.getElementById('btn-save-member');
    const memberFormMessage = document.getElementById('member-form-message');

    // Member Directory Elements
    const membersBody = document.getElementById('members-body');
    const noMembers = document.getElementById('no-members');
    const searchMembersInput = document.getElementById('search-members');
    const refreshMembersBtn = document.getElementById('refresh-members-btn');

    // Modal Elements
    const editModal = document.getElementById('edit-member-modal');
    const editForm = document.getElementById('edit-member-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('btn-cancel-edit');
    const editOriginalHouseNum = document.getElementById('edit-original-house-number');
    const editHouseNum = document.getElementById('edit-house-number');
    const editName = document.getElementById('edit-name');
    const editAddress = document.getElementById('edit-address');
    const editPhone = document.getElementById('edit-phone');
    const editAadhar = document.getElementById('edit-aadhar');

    // Data State
    let allTickets = [];
    let allMembers = [];

    // Helper: Default Seed Members
    function getStoredMembers() {
        const rawLocal = localStorage.getItem('yerla_members');
        let localMembers = [];
        if (rawLocal) {
            try { localMembers = JSON.parse(rawLocal); } catch (e) {}
        }
        if (!localMembers || localMembers.length === 0) {
            localMembers = [
                { id: "m1", houseNumber: "H-101", name: "Harsh Choudhary", address: "House No 101, Main Road, Yerla", phone: "9876543210", aadharNumber: "1234-5678-9012", createdAt: new Date().toISOString() },
                { id: "m2", houseNumber: "H-102", name: "Sumit Sawankar", address: "Plot No 42, Station Road, Yerla", phone: "9988776655", aadharNumber: "9876-5432-1098", createdAt: new Date().toISOString() },
                { id: "m3", houseNumber: "H-103", name: "Priya Sharma", address: "Wada No 12, Market Square, Yerla", phone: "9123456789", aadharNumber: "5566-7788-9900", createdAt: new Date().toISOString() }
            ];
            localStorage.setItem('yerla_members', JSON.stringify(localMembers));
        }
        return localMembers;
    }

    // Password Login Handling (Required Password: yerla123)
    if (sessionStorage.getItem('managerLoggedIn') === 'true') {
        showManagerDashboard();
    } else {
        showLoginForm();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pwd = passwordInput ? passwordInput.value.trim() : '';
            if (pwd === 'yerla123') {
                sessionStorage.setItem('managerLoggedIn', 'true');
                if (loginError) loginError.classList.add('hidden');
                showManagerDashboard();
                if (passwordInput) passwordInput.value = '';
            } else {
                if (loginError) loginError.classList.remove('hidden');
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('managerLoggedIn');
            showLoginForm();
        });
    }

    function showLoginForm() {
        if (viewLogin) {
            viewLogin.classList.add('active');
            viewLogin.classList.remove('hidden');
        }
        if (viewManager) {
            viewManager.classList.remove('active');
            viewManager.classList.add('hidden');
        }
        if (btnLogout) btnLogout.style.display = 'none';
    }

    function showManagerDashboard() {
        if (viewLogin) {
            viewLogin.classList.remove('active');
            viewLogin.classList.add('hidden');
        }
        if (viewManager) {
            viewManager.classList.add('active');
            viewManager.classList.remove('hidden');
        }
        if (btnLogout) btnLogout.style.display = 'inline-block';
        loadDashboardData();
    }

    // Tab Switchers
    function switchTab(activeTabBtn, activeContentEl) {
        [tabRequests, tabAddMember, tabViewMembers].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        [contentRequests, contentAddMember, contentViewMembers].forEach(content => {
            if (content) content.classList.add('hidden');
        });

        if (activeTabBtn) activeTabBtn.classList.add('active');
        if (activeContentEl) activeContentEl.classList.remove('hidden');

        // Refresh Directory when switching to Member Directory tab
        if (activeTabBtn === tabViewMembers) {
            if (searchMembersInput) searchMembersInput.value = '';
            fetchMembers();
        }
    }

    if (tabRequests) tabRequests.addEventListener('click', () => switchTab(tabRequests, contentRequests));
    if (tabAddMember) tabAddMember.addEventListener('click', () => switchTab(tabAddMember, contentAddMember));
    if (tabViewMembers) tabViewMembers.addEventListener('click', () => switchTab(tabViewMembers, contentViewMembers));

    // Load Data
    async function loadDashboardData() {
        await Promise.all([fetchTickets(), fetchMembers()]);
    }

    if (refreshRequestsBtn) refreshRequestsBtn.addEventListener('click', fetchTickets);
    if (refreshMembersBtn) refreshMembersBtn.addEventListener('click', fetchMembers);
    if (statusFilter) statusFilter.addEventListener('change', renderTickets);

    // Fetch & Merge Tickets from LocalStorage & API
    async function fetchTickets() {
        let localTickets = [];
        const rawLocal = localStorage.getItem('yerla_tickets');
        if (rawLocal) {
            try { localTickets = JSON.parse(rawLocal); } catch (e) {}
        }

        let apiTickets = [];
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) apiTickets = data;
            }
        } catch (e) {
            console.warn('API offline, using local tickets');
        }

        const ticketMap = new Map();
        [...localTickets, ...apiTickets].forEach(t => {
            if (t && t.id) ticketMap.set(t.id, t);
        });

        allTickets = Array.from(ticketMap.values());
        allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        updateStats();
        renderTickets();
    }

    // Render Tickets Table
    function renderTickets() {
        if (!ticketsBody) return;
        const filterVal = statusFilter ? statusFilter.value : 'All';
        const filtered = allTickets.filter(t => {
            if (filterVal === 'All') return true;
            return t.status === filterVal;
        });

        ticketsBody.innerHTML = '';

        if (filtered.length === 0) {
            if (noTickets) noTickets.classList.remove('hidden');
            return;
        }

        if (noTickets) noTickets.classList.add('hidden');

        filtered.forEach(ticket => {
            const tr = document.createElement('tr');
            
            const dateStr = ticket.createdAt 
                ? new Date(ticket.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                : 'N/A';

            const requirementText = ticket.requestType === 'Monthly' 
                ? `<span style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Monthly (${ticket.numberOfCans} Cans)</span>`
                : `<span style="background: rgba(59, 130, 246, 0.1); color: #2563eb; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Daily (${ticket.numberOfCans} Cans)</span>`;

            const statusBadge = ticket.status === 'Fulfilled'
                ? `<span class="badge fulfilled">Fulfilled</span>`
                : `<span class="badge pending">Pending</span>`;

            const actionBtn = ticket.status === 'Pending'
                ? `<button class="fulfill-btn" onclick="fulfillTicket('${ticket.id}')">Fulfill Order</button>`
                : `<span style="color:#10b981; font-weight:600;">✓ Done</span>`;

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong style="color:var(--primary-color); font-size:1.05rem;">${ticket.houseNumber || 'N/A'}</strong></td>
                <td>
                    <strong>${ticket.name || 'N/A'}</strong><br>
                    <small style="color:var(--text-muted);">${ticket.address || 'N/A'}</small>
                </td>
                <td>${ticket.phone || 'N/A'}</td>
                <td>${requirementText}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            `;

            ticketsBody.appendChild(tr);
        });
    }

    // Fulfill Ticket Action
    window.fulfillTicket = async (ticketId) => {
        if (!confirm('Mark this water request as Fulfilled?')) return;

        // Update Local Storage
        const rawLocal = localStorage.getItem('yerla_tickets');
        if (rawLocal) {
            try {
                let tickets = JSON.parse(rawLocal);
                const item = tickets.find(t => t.id === ticketId);
                if (item) item.status = 'Fulfilled';
                localStorage.setItem('yerla_tickets', JSON.stringify(tickets));
            } catch (e) {}
        }

        // Update In-Memory array
        const found = allTickets.find(t => t.id === ticketId);
        if (found) found.status = 'Fulfilled';

        // Update API
        try {
            await fetch(`/api/tickets/${ticketId}/fulfill`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {}

        updateStats();
        renderTickets();
    };

    // Fetch & Merge Members safely
    async function fetchMembers() {
        const localMembers = getStoredMembers();

        let apiMembers = [];
        try {
            const res = await fetch('/api/members');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) apiMembers = data;
            }
        } catch (e) {
            console.warn('API offline, using local members');
        }

        const memberMap = new Map();
        [...localMembers, ...apiMembers].forEach(m => {
            if (m) {
                const hn = (m.houseNumber || m.house_number || '').toString().trim();
                if (hn) {
                    memberMap.set(hn.toUpperCase(), {
                        id: m.id || Date.now().toString(),
                        houseNumber: hn.toUpperCase(),
                        name: m.name || 'N/A',
                        address: m.address || 'N/A',
                        phone: m.phone || 'N/A',
                        aadharNumber: m.aadharNumber || m.aadhar_number || '-',
                        createdAt: m.createdAt || m.created_at || new Date().toISOString()
                    });
                }
            }
        });

        allMembers = Array.from(memberMap.values());
        updateStats();
        renderMembers();
    }

    // Render Members Table with EDIT and DELETE Actions
    function renderMembers() {
        if (!membersBody) return;
        const query = searchMembersInput ? searchMembersInput.value.toLowerCase().trim() : '';
        const filtered = allMembers.filter(m => {
            return (m.houseNumber && m.houseNumber.toLowerCase().includes(query)) ||
                   (m.name && m.name.toLowerCase().includes(query)) ||
                   (m.phone && m.phone.toLowerCase().includes(query));
        });

        membersBody.innerHTML = '';

        if (filtered.length === 0) {
            if (noMembers) noMembers.classList.remove('hidden');
            return;
        }

        if (noMembers) noMembers.classList.add('hidden');

        filtered.forEach(m => {
            const tr = document.createElement('tr');
            const dateStr = m.createdAt 
                ? new Date(m.createdAt).toLocaleDateString('en-IN')
                : 'N/A';

            tr.innerHTML = `
                <td><strong style="color:var(--primary-color); font-size:1.05rem;">${m.houseNumber}</strong></td>
                <td><strong>${m.name}</strong></td>
                <td>${m.address}</td>
                <td>${m.phone}</td>
                <td>${m.aadharNumber || '-'}</td>
                <td>${dateStr}</td>
                <td style="white-space: nowrap;">
                    <button class="secondary-btn" onclick="openEditModal('${m.houseNumber}')" style="display:inline-flex; padding:0.4rem 0.7rem; font-size:0.85rem; margin-right:4px; border-color:#0ea5e9; color:#0ea5e9;">
                        ✏️ Edit
                    </button>
                    <button class="secondary-btn" onclick="deleteMember('${m.houseNumber}')" style="display:inline-flex; padding:0.4rem 0.7rem; font-size:0.85rem; border-color:#ef4444; color:#ef4444;">
                        🗑️ Delete
                    </button>
                </td>
            `;

            membersBody.appendChild(tr);
        });
    }

    if (searchMembersInput) searchMembersInput.addEventListener('input', renderMembers);

    // Open Edit Modal Function
    window.openEditModal = (houseNum) => {
        const member = allMembers.find(m => m.houseNumber === houseNum);
        if (!member) return;

        editOriginalHouseNum.value = member.houseNumber;
        editHouseNum.value = member.houseNumber;
        editName.value = member.name;
        editAddress.value = member.address;
        editPhone.value = member.phone;
        editAadhar.value = member.aadharNumber || '';

        editModal.classList.remove('hidden');
    };

    // Close Modal Event Listeners
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    // Handle Edit Form Submission
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const houseNum = editOriginalHouseNum.value;
            const updatedMember = {
                houseNumber: houseNum,
                name: editName.value.trim(),
                address: editAddress.value.trim(),
                phone: editPhone.value.trim(),
                aadharNumber: editAadhar.value.trim() || '-'
            };

            // Update in Local Storage
            let stored = getStoredMembers();
            const idx = stored.findIndex(m => (m.houseNumber || '').toUpperCase() === houseNum.toUpperCase());
            if (idx >= 0) {
                stored[idx] = { ...stored[idx], ...updatedMember };
            } else {
                stored.unshift(updatedMember);
            }
            localStorage.setItem('yerla_members', JSON.stringify(stored));

            // Update in API
            try {
                await fetch(`/api/members/${encodeURIComponent(houseNum)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedMember)
                });
            } catch (err) {}

            editModal.classList.add('hidden');
            fetchMembers();
        });
    }

    // Delete Member Function
    window.deleteMember = async (houseNum) => {
        if (!confirm(`Are you sure you want to delete member with House Number ${houseNum}?`)) return;

        // Delete from Local Storage
        let stored = getStoredMembers();
        stored = stored.filter(m => (m.houseNumber || '').toUpperCase() !== houseNum.toUpperCase());
        localStorage.setItem('yerla_members', JSON.stringify(stored));

        // Delete from API
        try {
            await fetch(`/api/members/${encodeURIComponent(houseNum)}`, {
                method: 'DELETE'
            });
        } catch (err) {}

        fetchMembers();
    };

    // Add Member Form Handler
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const houseNumber = document.getElementById('reg-house-number').value.trim().toUpperCase();
            const name = document.getElementById('reg-name').value.trim();
            const address = document.getElementById('reg-address').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const aadharNumber = document.getElementById('reg-aadhar').value.trim();

            if (!houseNumber || !name || !address || !phone) {
                showMemberMessage('House Number, Name, Address, and Phone are required!', 'error');
                return;
            }

            if (btnSaveMember) {
                btnSaveMember.disabled = true;
                btnSaveMember.textContent = 'Saving Member...';
            }

            const newMember = {
                id: Date.now().toString(),
                houseNumber,
                name,
                address,
                phone,
                aadharNumber: aadharNumber || '-',
                createdAt: new Date().toISOString()
            };

            // 1. Save to Local Storage immediately
            const stored = getStoredMembers();
            const filteredStored = stored.filter(m => (m.houseNumber || '').toUpperCase() !== houseNumber);
            filteredStored.unshift(newMember);
            localStorage.setItem('yerla_members', JSON.stringify(filteredStored));

            // 2. Save to Backend API if online
            try {
                await fetch('/api/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ houseNumber, name, address, phone, aadharNumber })
                });
            } catch (e) {}

            showMemberMessage(`✓ Member ${newMember.name} (House No: ${newMember.houseNumber}) registered successfully!`, 'success');
            addMemberForm.reset();

            // 3. Immediately refresh table data & switch tab
            fetchMembers();

            setTimeout(() => {
                switchTab(tabViewMembers, contentViewMembers);
            }, 1000);

            if (btnSaveMember) {
                btnSaveMember.disabled = false;
                btnSaveMember.textContent = 'Save Member Record / सदस्य नोंदणी जतन करा';
            }
        });
    }

    function showMemberMessage(msg, type) {
        if (!memberFormMessage) return;
        memberFormMessage.innerHTML = msg;
        memberFormMessage.className = `message ${type}`;
        memberFormMessage.classList.remove('hidden');
    }

    function updateStats() {
        if (statMembers) statMembers.textContent = allMembers.length;
        const pendingCount = allTickets.filter(t => t.status === 'Pending').length;
        const fulfilledCount = allTickets.filter(t => t.status === 'Fulfilled').length;
        if (statPending) statPending.textContent = pendingCount;
        if (statFulfilled) statFulfilled.textContent = fulfilledCount;
    }

    // Export PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (!window.jspdf) {
                alert('PDF library not loaded');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.text('Grampanchayat Yerla - RO Water Requests Report', 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 26);

            const tableColumn = ["Date", "House No", "Name", "Contact & Address", "Requirement", "Status"];
            const tableRows = [];

            allTickets.forEach(t => {
                const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : 'N/A';
                const reqStr = `${t.requestType} (${t.numberOfCans} Cans)`;
                tableRows.push([
                    dateStr,
                    t.houseNumber || 'N/A',
                    t.name || 'N/A',
                    `${t.phone || ''} | ${t.address || ''}`,
                    reqStr,
                    t.status
                ]);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 32,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [14, 116, 144] }
            });

            doc.save(`Grampanchayat_Yerla_Water_Requests_${Date.now()}.pdf`);
        });
    }
});
