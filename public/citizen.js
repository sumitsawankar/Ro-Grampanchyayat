document.addEventListener('DOMContentLoaded', () => {
    const houseInput = document.getElementById('house-number');
    const btnVerifyHouse = document.getElementById('btn-verify-house');
    const memberVerifiedCard = document.getElementById('member-verified-card');
    const verifiedName = document.getElementById('verified-name');
    const verifiedAddress = document.getElementById('verified-address');
    const verifiedPhone = document.getElementById('verified-phone');

    const radioDaily = document.getElementById('radio-daily');
    const radioMonthly = document.getElementById('radio-monthly');
    const sectionDaily = document.getElementById('section-daily');
    const sectionMonthly = document.getElementById('section-monthly');

    const form = document.getElementById('citizen-request-form');
    const formMessage = document.getElementById('citizen-form-message');
    const submitBtn = document.getElementById('submit-request-btn');

    let verifiedMemberData = null;

    // Helper: Initial Local Members Seed
    function getStoredMembers() {
        const stored = localStorage.getItem('yerla_members');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        const defaultMembers = [
            { id: "m1", houseNumber: "H-101", name: "Harsh Choudhary", address: "House No 101, Main Road, Yerla", phone: "9876543210", aadharNumber: "1234-5678-9012" },
            { id: "m2", houseNumber: "H-102", name: "Sumit Sawankar", address: "Plot No 42, Station Road, Yerla", phone: "9988776655", aadharNumber: "9876-5432-1098" },
            { id: "m3", houseNumber: "H-103", name: "Priya Sharma", address: "Wada No 12, Market Square, Yerla", phone: "9123456789", aadharNumber: "5566-7788-9900" }
        ];
        localStorage.setItem('yerla_members', JSON.stringify(defaultMembers));
        return defaultMembers;
    }

    // Helper: Normalize House Number for matching (e.g., "H102" -> "H102", "H-102" -> "H102")
    function cleanHouseNum(hn) {
        return (hn || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    // Toggle Order Type Sections
    if (radioDaily && radioMonthly) {
        radioDaily.addEventListener('change', () => {
            if (radioDaily.checked) {
                sectionDaily.classList.remove('hidden');
                sectionMonthly.classList.add('hidden');
            }
        });

        radioMonthly.addEventListener('change', () => {
            if (radioMonthly.checked) {
                sectionMonthly.classList.remove('hidden');
                sectionDaily.classList.add('hidden');
            }
        });
    }

    // Helper to verify house number
    const verifyHouseNumber = async () => {
        const rawInput = houseInput.value.trim();
        if (!rawInput) {
            showMessage('Please enter a House Number / कृपया घर क्रमांक प्रविष्ट करा', 'error');
            return false;
        }

        const normalizedInput = cleanHouseNum(rawInput);

        if (btnVerifyHouse) {
            btnVerifyHouse.disabled = true;
            btnVerifyHouse.textContent = 'Verifying...';
        }

        let foundMember = null;

        // 1. Try Backend API
        try {
            const res = await fetch(`/api/members/${encodeURIComponent(rawInput)}`);
            if (res.ok) {
                foundMember = await res.json();
            }
        } catch (err) {
            console.warn('API lookup offline, searching localStorage');
        }

        // 2. Search Local Storage / Default Seed
        if (!foundMember) {
            const members = getStoredMembers();
            foundMember = members.find(m => cleanHouseNum(m.houseNumber) === normalizedInput);
        }

        if (btnVerifyHouse) {
            btnVerifyHouse.disabled = false;
            btnVerifyHouse.textContent = 'Verify / पडताळा';
        }

        if (foundMember) {
            verifiedMemberData = foundMember;
            verifiedName.textContent = foundMember.name;
            verifiedAddress.textContent = foundMember.address;
            verifiedPhone.textContent = foundMember.phone;
            memberVerifiedCard.classList.remove('hidden');
            hideMessage();
            return true;
        } else {
            memberVerifiedCard.classList.add('hidden');
            verifiedMemberData = null;
            showMessage(`House Number "${rawInput}" is not registered yet! Please ask Gram Panchayat Manager to register your house number first.`, 'error');
            return false;
        }
    };

    if (btnVerifyHouse) btnVerifyHouse.addEventListener('click', verifyHouseNumber);

    if (houseInput) {
        houseInput.addEventListener('blur', () => {
            if (houseInput.value.trim().length >= 2) {
                verifyHouseNumber();
            }
        });
    }

    // Handle Water Request Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rawInput = houseInput.value.trim();
            if (!rawInput) {
                showMessage('House Number is required', 'error');
                return;
            }

            if (!verifiedMemberData || cleanHouseNum(verifiedMemberData.houseNumber) !== cleanHouseNum(rawInput)) {
                const isValid = await verifyHouseNumber();
                if (!isValid) return;
            }

            const isMonthly = radioMonthly && radioMonthly.checked;
            const requestType = isMonthly ? 'Monthly' : 'Daily';
            const numberOfCans = isMonthly 
                ? parseInt(document.getElementById('monthly-cans-select').value)
                : parseInt(document.getElementById('daily-cans').value) || 1;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting Request...';

            const newTicket = {
                id: Date.now().toString(),
                houseNumber: verifiedMemberData.houseNumber,
                name: verifiedMemberData.name,
                address: verifiedMemberData.address,
                phone: verifiedMemberData.phone,
                requestType: requestType,
                numberOfCans: numberOfCans,
                status: 'Pending',
                createdAt: new Date().toISOString()
            };

            // 1. Save to Backend API if online
            try {
                const response = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        houseNumber: verifiedMemberData.houseNumber,
                        requestType: requestType,
                        numberOfCans: numberOfCans
                    })
                });
                if (response.ok) {
                    const serverTicket = await response.json();
                    if (serverTicket && serverTicket.id) newTicket.id = serverTicket.id;
                }
            } catch (err) {
                console.warn('Backend API offline, saving to localStorage');
            }

            // 2. Always sync to LocalStorage so Manager Portal sees it instantly
            const storedTicketsRaw = localStorage.getItem('yerla_tickets');
            let storedTickets = [];
            if (storedTicketsRaw) {
                try { storedTickets = JSON.parse(storedTicketsRaw); } catch (e) {}
            }
            storedTickets.unshift(newTicket);
            localStorage.setItem('yerla_tickets', JSON.stringify(storedTickets));

            // Success display
            const cansText = isMonthly 
                ? `${numberOfCans} Cans/Month (मासिक पॅकेज)`
                : `${numberOfCans} Can(s) (दैनंदिन मागणी)`;

            showMessage(
                `✓ Request Submitted Successfully!<br>` +
                `<strong>Ticket ID:</strong> #${newTicket.id.substring(0, 8)}<br>` +
                `<strong>House No:</strong> ${newTicket.houseNumber}<br>` +
                `<strong>Name:</strong> ${newTicket.name}<br>` +
                `<strong>Phone:</strong> ${newTicket.phone}<br>` +
                `<strong>Requirement:</strong> ${cansText}<br>` +
                `<span style="color:#059669; font-weight:700;">Status: Pending Manager Fulfillment</span>`,
                'success'
            );

            if (document.getElementById('daily-cans')) {
                document.getElementById('daily-cans').value = 1;
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Water Request / पाणी मागणी पाठवा';
        });
    }

    function showMessage(msg, type) {
        if (!formMessage) return;
        formMessage.innerHTML = msg;
        formMessage.className = `message ${type}`;
        formMessage.classList.remove('hidden');
    }

    function hideMessage() {
        if (formMessage) formMessage.classList.add('hidden');
    }
});
