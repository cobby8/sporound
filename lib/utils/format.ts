export function formatPhoneNumber(value: string): string {
    if (!value) return "";

    // Remove all non-numeric characters
    const numbers = value.replace(/[^\d]/g, "");

    // Format based on length
    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
}
