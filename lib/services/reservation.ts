
import { supabase } from '@/lib/supabase';
import { TimeSlot, CellData } from '@/lib/data';

// Database types
export interface ReservationDB {
    id: string;
    user_id: string | null;
    court_id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'canceled' | 'rejected';
    purpose: string | null;
    courts?: {
        name: string;
    };
}

export const COURTS = {
    PINK: 'pink',
    MINT: 'mint',
} as const;

const DAYS_KEY_MAP = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Fetches reservations for 7 days starting from `startDate` and returns them in the `TimeSlot` format for UI.
 * @param startDateStr "YYYY-MM-DD" formatted string
 */
export async function getWeeklySchedule(startDateStr: string): Promise<TimeSlot[]> {
    if (!supabase) return [];

    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Fetch reservations for the week range
    const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
            *,
            courts ( name )
        `)
        .gte('date', startDateStr)
        .lt('date', endDateStr)
        .neq('status', 'canceled')
        .neq('status', 'rejected');

    if (error) {
        console.error('Error fetching reservations:', error);
        return [];
    }

    // 2. Build empty schedule skeleton (6:00 - 24:00)
    const timeSlots: TimeSlot[] = [];
    const START_HOUR = 6;
    const END_HOUR = 24;

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        const timeStr = `${hour}:00`;
        const slot: TimeSlot = {
            time: timeStr,
            courts: {
                mon: { pink: emptyCell(), mint: emptyCell() },
                tue: { pink: emptyCell(), mint: emptyCell() },
                wed: { pink: emptyCell(), mint: emptyCell() },
                thu: { pink: emptyCell(), mint: emptyCell() },
                fri: { pink: emptyCell(), mint: emptyCell() },
                sat: { pink: emptyCell(), mint: emptyCell() },
                sun: { pink: emptyCell(), mint: emptyCell() },
            }
        };
        timeSlots.push(slot);
    }

    // 3. Fill in reservations
    // We iterate through all reservations and populate the corresponding cells
    reservations?.forEach((res: ReservationDB) => {
        if (!res.courts) return;

        const resDate = new Date(res.date);

        // Find which day index (0-6) relative to start date
        // Note: This logic assumes the dashboard always starts from a specific day (like Monday) or we just map by date differnce.
        // The current UI just assumes 'mon', 'tue' etc. 
        // We need to map the reservation date to the correct day column.

        // Simple hack: getDay() 0=Sun, 1=Mon...
        // But our `DAYS_KEY_MAP` is 0=Mon, 6=Sun.
        let dayIndex = resDate.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6; // Sunday

        // Check if this reservation belongs to the current week logic?
        // Ideally we should trust the date filter.

        const dayKey = DAYS_KEY_MAP[dayIndex]; // e.g., 'mon'

        const courtName = res.courts.name === 'pink' ? 'pink' : 'mint';
        const startH = parseInt(res.start_time.split(':')[0]);
        const endH = parseInt(res.end_time.split(':')[0]);
        const duration = endH - startH;

        // Find the starting row
        const startRowIndex = startH - START_HOUR;
        if (startRowIndex < 0 || startRowIndex >= timeSlots.length) return;

        // Apply to the start cell
        const targetCell = timeSlots[startRowIndex].courts[dayKey][courtName];
        targetCell.text = '예약됨'; // Or user name if authorized
        targetCell.rowSpan = duration;

        // Mark subsequent cells as hidden (rowSpan = 0)
        for (let i = 1; i < duration; i++) {
            if (startRowIndex + i < timeSlots.length) {
                const hiddenCell = timeSlots[startRowIndex + i].courts[dayKey][courtName];
                hiddenCell.rowSpan = 0;
            }
        }
    });

    return timeSlots;
}

function emptyCell(): CellData {
    return { text: '', rowSpan: 1 };
}
