export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Descarga fallida (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
