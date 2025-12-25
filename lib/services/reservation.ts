
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
    // Added for display
    team_name?: string;
    guest_name?: string;
    guest_phone?: string; // Added field
    people_count?: number; // Added field
    total_price?: number; // Added field
    group_id?: string; // Added field
    recurrence_rule?: any; // Added field
    final_fee?: number; // Added field
    payment_status?: 'unpaid' | 'paid' | 'adjustment_requested'; // Added field
    adjustment_reason?: string; // Added field
    color?: string;
    profiles?: {
        name: string;
        phone?: string; // Added field
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
// Helper: "HH:mm" -> minutes from midnight
const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

export async function getWeeklySchedule(startDateStr: string): Promise<TimeSlot[]> {
    if (!supabase) return [];

    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Fetch reservations for the week range
    let reservations: any[] | null = [];
    try {
        const result = await supabase
            .from('reservations')
            .select(`
                *,
                profiles ( name ),
                courts ( name )
            `)
            .gte('date', startDateStr)
            .lt('date', endDateStr)
            .neq('status', 'canceled')
            .neq('status', 'rejected');

        if (result.error) {
            console.error('Error fetching reservations:', JSON.stringify(result.error, null, 2));
            return [];
        }
        reservations = result.data;
    } catch (e) {
        console.error('Unexpected error fetching reservations:', e);
        return [];
    }

    // 2. Build empty schedule skeleton (6:00 - 24:00, 30-min intervals)
    const timeSlots: TimeSlot[] = [];
    const START_HOUR = 6;
    const END_HOUR = 24;

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        // :00 slot
        const timeStr00 = `${hour < 10 ? '0' : ''}${hour}:00`;
        timeSlots.push({
            time: timeStr00,
            courts: {
                mon: { pink: emptyCell(), mint: emptyCell() },
                tue: { pink: emptyCell(), mint: emptyCell() },
                wed: { pink: emptyCell(), mint: emptyCell() },
                thu: { pink: emptyCell(), mint: emptyCell() },
                fri: { pink: emptyCell(), mint: emptyCell() },
                sat: { pink: emptyCell(), mint: emptyCell() },
                sun: { pink: emptyCell(), mint: emptyCell() },
            }
        });

        // :30 slot
        const timeStr30 = `${hour < 10 ? '0' : ''}${hour}:30`;
        timeSlots.push({
            time: timeStr30,
            courts: {
                mon: { pink: emptyCell(), mint: emptyCell() },
                tue: { pink: emptyCell(), mint: emptyCell() },
                wed: { pink: emptyCell(), mint: emptyCell() },
                thu: { pink: emptyCell(), mint: emptyCell() },
                fri: { pink: emptyCell(), mint: emptyCell() },
                sat: { pink: emptyCell(), mint: emptyCell() },
                sun: { pink: emptyCell(), mint: emptyCell() },
            }
        });
    }

    const START_MINUTES = START_HOUR * 60; // 360 (06:00)

    // 3. Fill in reservations
    reservations?.forEach((res: ReservationDB) => {
        if (!res.courts) return;

        const resDate = new Date(res.date);
        let dayIndex = resDate.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6; // Sunday -> 6
        const dayKey = DAYS_KEY_MAP[dayIndex];

        const cName = res.courts.name?.toLowerCase();
        const courtName = (cName === 'pink' || cName === '핑크') ? 'pink' : 'mint';

        const startMinutes = toMinutes(res.start_time);
        const endMinutes = toMinutes(res.end_time);

        // Find start index
        // timeSlots[0] is 06:00 (360 min)
        // index = (minutes - 360) / 30
        const startRowIndex = (startMinutes - START_MINUTES) / 30;

        // If out of bounds or not an integer (though 30-min aligned should be int)
        if (startRowIndex < 0 || startRowIndex >= timeSlots.length) return;

        const durationMinutes = endMinutes - startMinutes;
        const rowSpan = Math.ceil(durationMinutes / 30);

        // Apply to the start cell
        const targetCell = timeSlots[startRowIndex].courts[dayKey][courtName];

        // Display Priority: Team Name > User Name > Guest Name
        const baseText = res.team_name || res.profiles?.name || res.guest_name || '예약됨';
        const displayText = res.status === 'pending' ? `(대기) ${baseText}` : baseText;

        targetCell.text = displayText;
        targetCell.rowSpan = rowSpan;
        targetCell.color = res.color;
        targetCell.reservationId = res.id;

        // Mark subsequent cells as hidden
        for (let i = 1; i < rowSpan; i++) {
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

/**
 * Fetch all reservations for admin dashboard.
 * Supports filtering by page or date if needed later.
 */
export async function getAdminReservations() {
    // Calculate dynamic start date (e.g., 6 months ago) to ensure we fetch relevant recent/future data
    // within the 10k limit, rather than filling it with old 2024 history.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDateStr = sixMonthsAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('reservations')
        .select(`
            *,
            profiles ( email, name, phone ),
            courts ( name )
        `)
        .order('date', { ascending: true }) // Ascending: Recent Past -> Future
        .order('created_at', { ascending: true })
        .gte('date', startDateStr) // Filter dynamic range
        .range(0, 9999);


    if (error) throw error;
    return data;
}

/**
 * Update reservation status (approve/reject)
 */
export async function updateReservationStatus(id: string, status: 'confirmed' | 'rejected') {
    const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id);

    if (error) throw error;
}
