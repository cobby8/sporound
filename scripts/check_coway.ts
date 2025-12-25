
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking for 'Coway' / 'Blue Wheels' (Korean/English) and Date 2025-12-22...");

    // Check Korean terms
    const { data: k1 } = await supabase.from('reservations').select('*').ilike('team_name', '%코웨이%');
    const { data: k2 } = await supabase.from('reservations').select('*').ilike('purpose', '%코웨이%');
    const { data: k3 } = await supabase.from('reservations').select('*').ilike('team_name', '%블루휠즈%');
    const { data: k4 } = await supabase.from('reservations').select('*').ilike('team_name', '%Coway%');

    // Check Date 2025-12-22
    const { data: d1 } = await supabase.from('reservations').select('*').eq('date', '2025-12-22');

    const all = [
        ...(k1 || []),
        ...(k2 || []),
        ...(k3 || []),
        ...(k4 || []),
        ...(d1 || [])
    ];

    // dedupe
    const unique = Array.from(new Set(all.map(a => a.id))).map(id => all.find(a => a.id === id));

    console.log(`Found ${unique.length} matching reservations.`);

    if (unique.length > 0) {
        // Log first few and summary
        const statuses = [...new Set(unique.map(r => r.status))];
        console.log("Statuses found:", statuses);
        console.log("Samples:", unique.slice(0, 3).map(r => ({
            id: r.id,
            team: r.team_name,
            purpose: r.purpose,
            date: r.date,
            status: r.status
        })));
    } else {
        console.log("No data found.");
    }
}

check();
