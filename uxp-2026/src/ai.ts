export async function requestJsonWithFetch(request: any): Promise<string> {
  const url = String(request.url || "");
  if (!/^https:\/\//i.test(url)) throw new Error("AI Base URL must use HTTPS in the UXP version.");
  const controller = new AbortController();
  const timeoutMs = Number(request.timeoutMs) || 60000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      credentials: "omit",
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`AI polish API returned HTTP ${response.status}: ${text}`);
    return text;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error(`AI polish API timed out after ${timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
