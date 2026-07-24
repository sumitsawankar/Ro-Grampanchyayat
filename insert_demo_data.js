const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const isSupabaseConfigured = 
    supabaseUrl && 
    supabaseUrl !== 'https://YOUR_PROJECT_ID.supabase.co' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseKey && 
    supabaseKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' &&
    !supabaseKey.includes('placeholder');

// July 2026 dates (representing current month for manager report filtering)
const dates = [
    "2026-07-01T10:00:00.000Z",
    "2026-07-02T11:30:00.000Z",
    "2026-07-03T09:15:00.000Z",
    "2026-07-04T14:45:00.000Z",
    "2026-07-05T08:20:00.000Z"
];

const demoTickets = [
    {
        name: "Ramesh Rao",
        address: "Near High School, Yerla",
        phone: "9876543210",
        request_type: "Normal",
        number_of_cans: 5,
        payment_method: "Cash",
        photo: "/uploads/aadhar-demo.png",
        status: "Pending",
        created_at: dates[0]
    },
    {
        name: "Geeta Patil",
        address: "Ward No. 3, Yerla",
        phone: "8765432109",
        request_type: "Normal",
        number_of_cans: 3,
        payment_method: "Cash",
        photo: "/uploads/aadhar-demo.png",
        status: "Fulfilled",
        created_at: dates[1]
    },
    {
        name: "Aniket Deshmukh",
        address: "Main Road, Yerla",
        phone: "7654321098",
        request_type: "Normal",
        number_of_cans: 10,
        payment_method: "Cash",
        photo: "/uploads/aadhar-demo.png",
        status: "Pending",
        created_at: dates[2]
    },
    {
        name: "Vijay Sawarkar",
        address: "Chowk Bazar, Yerla",
        phone: "9999888877",
        request_type: "Subscription",
        number_of_cans: 30,
        payment_method: "UPI",
        photo: "/uploads/aadhar-demo.png",
        receipt_photo: "/uploads/receipt-demo.png",
        status: "Pending",
        created_at: dates[3]
    },
    {
        name: "Meena Chore",
        address: "Hanuman Mandir Lane, Yerla",
        phone: "8888777766",
        request_type: "Subscription",
        number_of_cans: 60,
        payment_method: "Cash",
        photo: "/uploads/aadhar-demo.png",
        status: "Fulfilled",
        created_at: dates[4]
    }
];

async function insertDemoData() {
    console.log("Starting demo data insertion...");

    // 1. Write to local data.json
    const localDataPath = path.join(__dirname, 'data.json');
    let localData = [];
    if (fs.existsSync(localDataPath)) {
        try {
            localData = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
        } catch (e) {
            console.error("Error reading data.json:", e);
        }
    }

    const localDemoTickets = demoTickets.map((t, idx) => ({
        id: (Date.now() + idx).toString(),
        name: t.name,
        address: t.address,
        phone: t.phone,
        requestType: t.request_type,
        numberOfCans: t.number_of_cans,
        paymentMethod: t.payment_method,
        photo: t.photo,
        receiptPhoto: t.receipt_photo || null,
        status: t.status,
        createdAt: t.created_at
    }));

    localData.push(...localDemoTickets);
    fs.writeFileSync(localDataPath, JSON.stringify(localData, null, 2), 'utf8');
    console.log(`Added ${localDemoTickets.length} items to local data.json.`);

    // 2. Write to Supabase if configured
    if (isSupabaseConfigured) {
        console.log("Supabase is configured. Inserting into Supabase...");
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data, error } = await supabase
            .from('tickets')
            .insert(demoTickets.map(t => ({
                name: t.name,
                address: t.address,
                phone: t.phone,
                request_type: t.request_type,
                number_of_cans: t.number_of_cans,
                payment_method: t.payment_method,
                photo: t.photo,
                receipt_photo: t.receipt_photo || null,
                status: t.status,
                created_at: t.created_at
            })));
        
        if (error) {
            console.error("Error inserting into Supabase:", error);
        } else {
            console.log("Successfully inserted demo records into Supabase.");
        }
    } else {
        console.log("Supabase not configured or placeholder values detected. Skipped Supabase insert.");
    }
}

insertDemoData();
