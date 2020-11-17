export const formatTime = (d: Date): string => {
    return `${d.toLocaleTimeString()}, ${d.toDateString()}`;
}
