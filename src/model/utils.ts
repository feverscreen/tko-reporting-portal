export const formatTime = (d: Date): string => {
  return `${d.toLocaleTimeString()} - ${d.toDateString()}`;
};

export const formatDate = (date: Date): string =>
  date.toISOString().replace(/:/g, "_").replace(/\./g, "_");
export const formatTsc = (dateStr: string): Date => {
      const date = dateStr.replace(/_/g, ":");
      const lastHyphen = date.lastIndexOf(":");
      const timestamp = new Date(
        Date.parse(
          `${date.substr(0, lastHyphen)}.${date.substr(lastHyphen + 1)}`
        )
      );
      return timestamp
}
