"use server";

import { supabase } from "@/lib/supabase";

export async function importGoogleSheetData() { // Keeping name for compatibility or rename? Let's rename but export as alias if needed, or just change usage. 
    // User asked to delete google sheet content. I will replace logic but might keep name temporarily or update usage.
    // Let's change name to `recoverCowayData` and update usage in `page.tsx` next.
    return recoverCowayData();
}

export async function recoverCowayData() {
    try {
        console.log("[Migration] Starting Coway DB recovery...");

        // 1. Search for keywords
        const keywords = ['%코웨이%', '%Coway%', '%블루휠즈%', '%Blue%'];
        let allMatches: any[] = [];

        for (const k of keywords) {
            const { data: d1 } = await supabase.from('reservations').select('*').ilike('team_name', k);
            const { data: d2 } = await supabase.from('reservations').select('*').ilike('purpose', k);
            if (d1) allMatches.push(...d1);
            if (d2) allMatches.push(...d2);
        }

        // 2. Search for specific date (12-22) just in case
        const { data: d3 } = await supabase.from('reservations').select('*').eq('date', '2025-12-22');
        if (d3) allMatches.push(...d3);

        // Deduplicate
        const unique = Array.from(new Set(allMatches.map(a => a.id))).map(id => allMatches.find(a => a.id === id));

        if (unique.length === 0) {
            return { success: false, message: "복구할 코웨이/블루휠즈 데이터를 찾지 못했습니다." };
        }

        // 3. Update status if needed
        let recoveredCount = 0;
        let alreadyFineCount = 0;

        for (const res of unique) {
            if (res.status !== 'confirmed') {
                const { error } = await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', res.id);
                if (!error) recoveredCount++;
            } else {
                alreadyFineCount++;
            }
        }

        return {
            success: true,
            message: `코웨이/블루휠즈 데이터 확인 완료.\n- 총 발견: ${unique.length}건\n- 상태 복구(승인처리): ${recoveredCount}건\n- 기존 정상: ${alreadyFineCount}건\n(2025-12-22 포함)`
        };

    } catch (e: any) {
        console.error(e);
        return { success: false, message: "서버 에러: " + e.message };
    }
}



