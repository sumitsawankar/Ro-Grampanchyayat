const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-key';

// Determine if real Supabase credentials are provided
const isSupabaseConfigured = 
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
    !process.env.SUPABASE_URL.includes('placeholder') &&
    process.env.SUPABASE_KEY && 
    process.env.SUPABASE_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' &&
    !process.env.SUPABASE_KEY.includes('placeholder');

let supabase = null;
if (isSupabaseConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
    }
} else {
    console.log('Using local JSON storage (members.json & data.json) as Supabase is not configured.');
}

const DATA_FILE = path.join(__dirname, 'data.json');
const MEMBERS_FILE = path.join(__dirname, 'members.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for local JSON file database
const readLocalData = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(rawData);
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return [];
    }
};

const writeLocalData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Error writing ${filePath}:`, e);
    }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== MEMBERS API ====================

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        if (!isSupabaseConfigured) {
            const members = readLocalData(MEMBERS_FILE);
            return res.json(members);
        }

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('house_number', { ascending: true });

        if (error) throw error;
        
        const mappedData = data.map(m => ({
            id: m.id,
            houseNumber: m.house_number,
            name: m.name,
            address: m.address,
            phone: m.phone,
            aadharNumber: m.aadhar_number,
            createdAt: m.created_at
        }));

        res.json(mappedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Get single member by House Number
app.get('/api/members/:houseNumber', async (req, res) => {
    try {
        const houseNum = req.params.houseNumber.trim().toUpperCase();

        if (!isSupabaseConfigured) {
            const members = readLocalData(MEMBERS_FILE);
            const member = members.find(m => m.houseNumber.toUpperCase() === houseNum);
            if (!member) {
                return res.status(404).json({ error: 'Member not found with this House Number' });
            }
            return res.json(member);
        }

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .ilike('house_number', houseNum)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Member not found with this House Number' });
        }

        res.json({
            id: data.id,
            houseNumber: data.house_number,
            name: data.name,
            address: data.address,
            phone: data.phone,
            aadharNumber: data.aadhar_number,
            createdAt: data.created_at
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch member details' });
    }
});

// Create new member
app.post('/api/members', async (req, res) => {
    try {
        const { houseNumber, name, address, phone, aadharNumber } = req.body;

        if (!houseNumber || !name || !address || !phone) {
            return res.status(400).json({ error: 'House Number, Name, Address, and Phone are required' });
        }

        const formattedHouseNum = houseNumber.trim().toUpperCase();

        if (!isSupabaseConfigured) {
            const members = readLocalData(MEMBERS_FILE);
            const existsIndex = members.findIndex(m => m.houseNumber.toUpperCase() === formattedHouseNum);
            
            const newMember = {
                id: existsIndex >= 0 ? members[existsIndex].id : Date.now().toString(),
                houseNumber: formattedHouseNum,
                name,
                address,
                phone,
                aadharNumber: aadharNumber || '',
                createdAt: new Date().toISOString()
            };

            if (existsIndex >= 0) {
                members[existsIndex] = newMember;
            } else {
                members.push(newMember);
            }
            writeLocalData(MEMBERS_FILE, members);
            return res.status(201).json(newMember);
        }

        const newMember = {
            house_number: formattedHouseNum,
            name,
            address,
            phone,
            aadhar_number: aadharNumber || ''
        };

        const { data, error } = await supabase
            .from('members')
            .upsert([newMember], { onConflict: 'house_number' })
            .select();

        if (error) throw error;

        res.status(201).json({
            id: data[0].id,
            houseNumber: data[0].house_number,
            name: data[0].name,
            address: data[0].address,
            phone: data[0].phone,
            aadharNumber: data[0].aadhar_number,
            createdAt: data[0].created_at
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// Update member by House Number
app.put('/api/members/:houseNumber', async (req, res) => {
    try {
        const houseNum = req.params.houseNumber.trim().toUpperCase();
        const { name, address, phone, aadharNumber } = req.body;

        if (!isSupabaseConfigured) {
            const members = readLocalData(MEMBERS_FILE);
            const idx = members.findIndex(m => m.houseNumber.toUpperCase() === houseNum);
            if (idx === -1) return res.status(404).json({ error: 'Member not found' });

            members[idx].name = name || members[idx].name;
            members[idx].address = address || members[idx].address;
            members[idx].phone = phone || members[idx].phone;
            members[idx].aadharNumber = aadharNumber !== undefined ? aadharNumber : members[idx].aadharNumber;

            writeLocalData(MEMBERS_FILE, members);
            return res.json(members[idx]);
        }

        const { data, error } = await supabase
            .from('members')
            .update({
                name,
                address,
                phone,
                aadhar_number: aadharNumber
            })
            .ilike('house_number', houseNum)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ error: 'Member not found' });

        res.json(data[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete member by House Number
app.delete('/api/members/:houseNumber', async (req, res) => {
    try {
        const houseNum = req.params.houseNumber.trim().toUpperCase();

        if (!isSupabaseConfigured) {
            let members = readLocalData(MEMBERS_FILE);
            members = members.filter(m => m.houseNumber.toUpperCase() !== houseNum);
            writeLocalData(MEMBERS_FILE, members);
            return res.json({ message: 'Member deleted successfully' });
        }

        const { error } = await supabase
            .from('members')
            .delete()
            .ilike('house_number', houseNum);

        if (error) throw error;
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ==================== TICKETS API ====================

// Get all tickets
app.get('/api/tickets', async (req, res) => {
    try {
        if (!isSupabaseConfigured) {
            const tickets = readLocalData(DATA_FILE);
            tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(tickets);
        }

        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedData = data.map(t => ({
            id: t.id,
            houseNumber: t.house_number,
            name: t.name,
            address: t.address,
            phone: t.phone,
            requestType: t.request_type,
            numberOfCans: t.number_of_cans,
            status: t.status,
            createdAt: t.created_at
        }));

        res.json(mappedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Create a new water request ticket
app.post('/api/tickets', async (req, res) => {
    try {
        const { houseNumber, requestType, numberOfCans } = req.body;

        if (!houseNumber) {
            return res.status(400).json({ error: 'Unique House Number is required' });
        }

        const formattedHouseNum = houseNumber.trim().toUpperCase();

        let memberInfo = null;

        if (!isSupabaseConfigured) {
            const members = readLocalData(MEMBERS_FILE);
            memberInfo = members.find(m => m.houseNumber.toUpperCase() === formattedHouseNum);
        } else {
            const { data } = await supabase
                .from('members')
                .select('*')
                .ilike('house_number', formattedHouseNum)
                .single();
            if (data) {
                memberInfo = {
                    name: data.name,
                    address: data.address,
                    phone: data.phone
                };
            }
        }

        if (!memberInfo) {
            return res.status(404).json({ error: `House Number ${formattedHouseNum} is not registered yet!` });
        }

        const cansCount = parseInt(numberOfCans) || 1;
        const type = requestType === 'Monthly' ? 'Monthly' : 'Daily';

        if (!isSupabaseConfigured) {
            const tickets = readLocalData(DATA_FILE);
            const newTicket = {
                id: Date.now().toString(),
                houseNumber: formattedHouseNum,
                name: memberInfo.name,
                address: memberInfo.address,
                phone: memberInfo.phone,
                requestType: type,
                numberOfCans: cansCount,
                status: 'Pending',
                createdAt: new Date().toISOString()
            };
            tickets.push(newTicket);
            writeLocalData(DATA_FILE, tickets);

            return res.status(201).json(newTicket);
        }

        const newTicket = {
            house_number: formattedHouseNum,
            name: memberInfo.name,
            address: memberInfo.address,
            phone: memberInfo.phone,
            request_type: type,
            number_of_cans: cansCount,
            status: 'Pending'
        };

        const { data, error } = await supabase
            .from('tickets')
            .insert([newTicket])
            .select();

        if (error) throw error;

        res.status(201).json({
            id: data[0].id,
            houseNumber: data[0].house_number,
            name: data[0].name,
            address: data[0].address,
            phone: data[0].phone,
            requestType: data[0].request_type,
            numberOfCans: data[0].number_of_cans,
            status: data[0].status,
            createdAt: data[0].created_at
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create water request' });
    }
});

// Update ticket status (Fulfill)
app.patch('/api/tickets/:id/fulfill', async (req, res) => {
    try {
        const { id } = req.params;

        if (!isSupabaseConfigured) {
            const tickets = readLocalData(DATA_FILE);
            const ticketIndex = tickets.findIndex(t => t.id === id);
            if (ticketIndex === -1) {
                return res.status(404).json({ error: 'Ticket not found' });
            }
            tickets[ticketIndex].status = 'Fulfilled';
            writeLocalData(DATA_FILE, tickets);
            return res.json(tickets[ticketIndex]);
        }

        const { data, error } = await supabase
            .from('tickets')
            .update({ status: 'Fulfilled' })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        res.json(data[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// Export Express app for Vercel
module.exports = app;

// Start local server if not running on Vercel
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
