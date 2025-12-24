import * as cheerio from 'cheerio';

// The "Published" ID (from the pubhtml URL provided by user)
const PUBLISHED_ID = '2PACX-1vQ6QoDlTAuU4yWEjihPmebGkqLkqfz2Q9m5BLR0wcu-pFQAQpVsg7Z_3XRgGO0VOtvvEgxjz-Atet1F';
const GID = '509718464';

// Use the specific sheet URL from the pubhtml structure
const PUBHTML_SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pubhtml/sheet?headers=false&gid=${GID}`;

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

export async function fetchSchedule(): Promise<TimeSlot[]> {
    try {
        const response = await fetch(PUBHTML_SHEET_URL, { next: { revalidate: 60 } });

        if (!response.ok) {
            console.error(`[Data] Failed to fetch schedule: ${response.status} ${response.statusText}`);
            return [];
        }

        const html = await response.text();
        console.log(`[Data] Fetched HTML length: ${html.length}`);
        const $ = cheerio.load(html);

        const schedule: TimeSlot[] = [];

        // Track pending merges: [colIndex] -> { text: string, remainingRows: number }
        const pendingMerges: { [colIndex: number]: { text: string; remainingRows: number } } = {};

        const rows = $('table tbody tr');
        console.log(`[Data] Total rows found: ${rows.length}`);

        // Find where data starts.
        let dataStartIndex = -1;
        rows.each((i, el) => {
            if (dataStartIndex !== -1) return;
            const tds = $(el).find('td');
            // We check index 1 (2nd td) for the time string
            const timeCell = tds.eq(1).text().trim();
            if (timeCell === '6:00') {
                dataStartIndex = i;
            }
        });

        if (dataStartIndex === -1) {
            dataStartIndex = 4;
        }

        // Iterate rows
        rows.each((rowIndex, rowElem) => {
            if (rowIndex < dataStartIndex) return;

            const cells = $(rowElem).find('td');

            // Construct logical row
            // We store explicit CellData objects
            const logicalRow: CellData[] = [];
            let cellIndex = 0;

            for (let col = 0; col < 18; col++) {
                if (pendingMerges[col] && pendingMerges[col].remainingRows > 0) {
                    // This is a continuation cell
                    // We propagate the text for logic, but mark rowSpan as 0 for rendering
                    logicalRow[col] = { text: pendingMerges[col].text, rowSpan: 0 };
                    pendingMerges[col].remainingRows--;
                    continue;
                }

                const cell = cells.eq(cellIndex);
                if (cell.length) {
                    let text = cell.text().trim();
                    const rowspanStr = cell.attr('rowspan');
                    const parsedVal = parseInt(rowspanStr || '1', 10);
                    const rowspan = isNaN(parsedVal) ? 1 : parsedVal;

                    logicalRow[col] = { text, rowSpan: rowspan };

                    if (rowspan > 1) {
                        pendingMerges[col] = { text, remainingRows: rowspan - 1 };
                    }
                    cellIndex++;
                } else {
                    logicalRow[col] = { text: '', rowSpan: 1 };
                }
            }

            // Time is in logical col 1
            const time = logicalRow[1]?.text || '';
            if (!time || !time.includes(':')) return;

            const slot: TimeSlot = {
                time,
                courts: {}
            };

            DAYS.forEach((day, dayIndex) => {
                // Mon (Index 0) -> Pink Col 2, Mint Col 3
                const pinkColIdx = 2 + (dayIndex * 2);
                const mintColIdx = 3 + (dayIndex * 2);

                slot.courts[day] = {
                    pink: logicalRow[pinkColIdx] || { text: '', rowSpan: 1 },
                    mint: logicalRow[mintColIdx] || { text: '', rowSpan: 1 }
                };
            });

            schedule.push(slot);
        });

        console.log(`[Data] Successfully parsed ${schedule.length} time slots.`);
        return schedule;

    } catch (error) {
        console.error(`[Data] CRITICAL ERROR in fetchSchedule:`, error);
        return [];
    }
}

// Helper to generate schedule from DB reservations
export function generateScheduleData(reservations: any[]): TimeSlot[] {
    const times = [
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
        "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
        "20:00", "21:00", "22:00", "23:00"
    ];

    return times.map(time => {
        const slot: TimeSlot = {
            time,
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

        // Populate slot based on reservations
        reservations.forEach(res => {
            const resDate = new Date(res.date);
            const dayKey = DAYS[resDate.getDay() === 0 ? 6 : resDate.getDay() - 1]; // Mon=0 -> index 0

            // Check if this reservation covers this time slot
            const startHour = parseInt(res.start_time.split(':')[0]);
            const endHour = parseInt(res.end_time.split(':')[0]);
            const currentHour = parseInt(time.split(':')[0]);

            if (currentHour >= startHour && currentHour < endHour) {
                // Use court name if available (from join), otherwise fallback to logic (or fix fetching)
                // Assuming 'pink' court name is 'pink' and 'mint' is 'mint' or 'green'
                const courtName = res.courts?.name?.toLowerCase();
                const courtKey = (courtName === 'pink' || courtName === '핑크') ? 'pink' : 'mint';

                // If this is the start hour, set text and calculate rowspan
                if (currentHour === startHour) {
                    // Display Priority: Team Name > User Name > Guest Name
                    let displayText = res.team_name || res.profiles?.name || res.guest_name || '예약';

                    slot.courts[dayKey][courtKey] = {
                        text: displayText,
                        rowSpan: endHour - startHour,
                        color: res.color,
                        reservationId: res.id
                    };
                } else {
                    // For subsequent hours, set rowspan 0 (handled by renderer)
                    slot.courts[dayKey][courtKey] = { text: "", rowSpan: 0 };
                }
            }
        });

        return slot;
    });
}
