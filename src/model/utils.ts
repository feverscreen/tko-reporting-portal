export const formatTime = (d: Date): string => {
  return `${d.toLocaleTimeString()} - ${d.toDateString()}`;
};

export const formatDate = (date: Date): string =>
  date.toISOString().replace(/:/g, "_").replace(/\./g, "_");
