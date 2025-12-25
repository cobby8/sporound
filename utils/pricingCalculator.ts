import { SupabaseClient } from '@supabase/supabase-js';

export interface PriceRule {
    id: string;
    name: string;
    court_id: string; // 'pink' or 'mint' UUID
    days_of_week: number[];
    start_time: string; // 'HH:mm:ss'
    end_time: string;   // 'HH:mm:ss'
    price_per_hour: number;
    priority: number;
}

export interface Package {
    id: string;
    name: string;
    court_id: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    total_price: number;
    badge_text?: string;
}

/**
 * Helper to convert "HH:mm" or "HH:mm:ss" to minutes from midnight
 */
export const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Calculate dynamic price for a given duration.
 * Strategy:
 * 1. Split the duration into 30-minute blocks (resolution).
 * 2. For each block, find the highest priority rule that covers it.
 * 3. Sum up the cost.
 */
export const calculateDynamicPrice = (
    date: Date,
    startTime: string, // "HH:mm"
    endTime: string,   // "HH:mm"
    courtId: string,   // UUID
    rules: PriceRule[]
): { total: number; breakdown: string[] } => {
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
    let startMins = timeToMinutes(startTime);
    let endMins = timeToMinutes(endTime);

    // Handle midnight crossover (e.g. 23:00 to 02:00)
    // Logic: For calculation, if end < start, we assume it's next day, so add 24*60
    if (endMins < startMins) {
        endMins += 24 * 60;
    }

    let totalPrice = 0;
    const breakdown: string[] = [];

    // Resolution: 30 minutes
    const step = 30;

    for (let current = startMins; current < endMins; current += step) {
        const currentSlotStart = current;
        const currentSlotEnd = current + step;

        // Normalize time to 0-1440 for rule checking
        // e.g. 25:00 (1am next day) -> 01:00
        const ruleCheckTime = currentSlotStart % (24 * 60);

        // Find matching rules
        const matches = rules.filter(r => {
            // 1. Check Court
            if (r.court_id && r.court_id !== courtId) return false;

            // 2. Check Day
            // Note: Realistically, if we cross midnight, the "day" might change. 
            // For simplicity v1: use the start date's day for the whole booking 
            // OR check if 'current' exceeds 1440.
            // Let's implement day-shift checking.
            let checkDay = dayOfWeek;
            if (current >= 1440) {
                checkDay = (dayOfWeek + 1) % 7;
            }
            if (!r.days_of_week.includes(checkDay)) return false;

            // 3. Check Time Range
            const rStart = timeToMinutes(r.start_time);
            let rEnd = timeToMinutes(r.end_time);

            // Handle rule crossing midnight (e.g. 23:00 to 08:00)
            // In DB, 23:00 to 08:00 might be stored as two rules or handled via logic.
            // My schema seeding split them: 23:00-23:59 and 00:00-08:00. 
            // So standard comparison works if rules are strictly 0-24.

            // However, if we encounter a rule stored as 23:00~08:00 directly?
            // Let's assume the seeding script strategy (split rules) is used for safety.
            // If not, we'd need normalize.

            return ruleCheckTime >= rStart && ruleCheckTime < rEnd;
        });

        // Pick highest priority
        matches.sort((a, b) => b.priority - a.priority);
        const bestRule = matches[0];

        let slotPrice = 0;
        if (bestRule) {
            // Price per 30 mins = hourly / 2
            slotPrice = bestRule.price_per_hour / (60 / step);
            // Debug info
            // breakdown.push(`${Math.floor(current/60)}:${current%60} - Rule: ${bestRule.name} (${slotPrice})`);
        } else {
            // Fallback: Default Base Price if no rule matches?
            // Should ideally not happen if we have a default coverage.
            // Let's assume 85000 as absolute fallback
            slotPrice = 85000 / 2;
            breakdown.push(`No Rule Found for ${current}, used default`);
        }

        totalPrice += slotPrice;
    }

    return { total: totalPrice, breakdown };
};

export const fetchRulesAndPackages = async (supabase: SupabaseClient) => {
    const { data: rules } = await supabase
        .from('price_rules')
        .select('*')
        .eq('is_active', true);

    const { data: packages } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true);

    return { rules: rules || [], packages: packages || [] };
};
