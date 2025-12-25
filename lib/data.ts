
export interface CellData {
    text: string;
    rowSpan: number;
    color?: string; // Hex or Class
    reservationId?: string; // Useful for editing
}

export interface TimeSlot {
    time: string;
    courts: {
        [key: string]: { // 'mon', 'tue', ...
            pink: CellData;
            mint: CellData;
        };
    };
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Helper to generate schedule from DB reservations
export function generateScheduleData(reservations: any[]): TimeSlot[] {
    const times: string[] = [];
    for (let h = 6; h <= 23; h++) {
        const hour = h < 10 ? `0${h}` : `${h}`;
        times.push(`${hour}:00`);
        if (h !== 23) times.push(`${hour}:30`);
    }

    // Helper: "HH:mm" -> minutes from midnight
    const toMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    return times.map(time => {
        const slot: TimeSlot = {
            time, // "HH:mm" format (e.g. "06:30")
            courts: {
                mon: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                tue: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                wed: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                thu: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                fri: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                sat: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
                sun: { pink: { text: "", rowSpan: 1 }, mint: { text: "", rowSpan: 1 } },
            }
        };

        const currentSlotMinutes = toMinutes(time);

        // Populate slot based on reservations
        reservations.forEach(res => {
            const resDate = new Date(res.date);
            const dayKey = DAYS[resDate.getDay() === 0 ? 6 : resDate.getDay() - 1]; // Mon=0 -> index 0

            const startMinutes = toMinutes(res.start_time);
            const endMinutes = toMinutes(res.end_time);

            // Check if this reservation covers this time slot
            // Range is [start, end)
            if (currentSlotMinutes >= startMinutes && currentSlotMinutes < endMinutes) {
                const courtName = res.courts?.name?.toLowerCase();
                const courtKey = (courtName === 'pink' || courtName === '핑크') ? 'pink' : 'mint';

                // If this is the start slot
                if (currentSlotMinutes === startMinutes) {
                    // Display Priority: Team Name > User Name > Guest Name
                    let displayText = res.team_name || res.profiles?.name || res.guest_name || '예약';
                    if (res.status === 'pending') {
                        displayText = `(대기) ${displayText}`;
                    }

                    // Calculate rowSpan: (duration in minutes) / 30
                    const durationMinutes = endMinutes - startMinutes;
                    const rowSpan = Math.ceil(durationMinutes / 30);

                    slot.courts[dayKey][courtKey] = {
                        text: displayText,
                        rowSpan: rowSpan,
                        color: res.color,
                        reservationId: res.id
                    };
                } else {
                    // Merged cell
                    slot.courts[dayKey][courtKey] = { text: "", rowSpan: 0 };
                }
            }
        });

        return slot;
    });
}
