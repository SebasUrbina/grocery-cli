export const BASE_URL = "";
export const DEFAULT_COORDS = { lat: -33.4372, lng: -70.6506 } as const; // Santiago
export const CONFIG_FILENAME = ".grocery-config.json";
export const SESSION_FILENAME = ".grocery-session.json";
export const API_PORT = 3200;

export const DEFAULT_HEADERS: Record<string, string> = {
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  "x-csrf-token": "x",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};
