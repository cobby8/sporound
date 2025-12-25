
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverCowayData() {
    console.log("Starting Coway DB recovery test...");

    const keywords = ['%코웨이%', '%Coway%', '%블루휠즈%', '%Blue%'];
    let allMatches: any[] = [];

    for (const k of keywords) {
        const { data: d1 } = await supabase.from('reservations').select('*').ilike('team_name', k);
        const { data: d2 } = await supabase.from('reservations').select('*').ilike('purpose', k);
        if (d1) allMatches.push(...d1);
        if (d2) allMatches.push(...d2);
    }

    const { data: d3 } = await supabase.from('reservations').select('*').eq('date', '2025-12-22');
    if (d3) allMatches.push(...d3);

    const unique = Array.from(new Set(allMatches.map(a => a.id))).map(id => allMatches.find(a => a.id === id));

    if (unique.length === 0) {
        console.log("No data found.");
        return;
    }

    let recoveredCount = 0;
    let alreadyFineCount = 0;

    for (const res of unique) {
        if (res.status !== 'confirmed') {
            console.log(`Recovering ${res.id} (Status: ${res.status})`);
            const { error } = await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', res.id);
            if (!error) recoveredCount++;
            else console.error("Update failed", error);
        } else {
            alreadyFineCount++;
        }
    }

    console.log(`Summary: Found ${unique.length}, Recovered ${recoveredCount}, Already OK ${alreadyFineCount}`);
}

recoverCowayData();
