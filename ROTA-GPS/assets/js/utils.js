export function parseTimeStr(timeStr) {
  if (!timeStr) return null;
  const [datePart, timePart] = timeStr.split(' ');
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  return new Date(year, month - 1, day, hour, minute, second || 0);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}
