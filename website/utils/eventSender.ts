let lastPageViewPath: string | null = null;
let pageviewTimeout: NodeJS.Timeout | null = null;
const PAGEVIEW_DEBOUNCE_DELAY = 100;

const getSessionId = (): string => {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `user-${Math.random()
      .toString(36)
      .substring(2, 11)}-${Date.now()}`;
    localStorage.setItem("sessionId", sessionId);
    console.log(`Generated new sessionId: ${sessionId}`);
  }
  return sessionId;
};

const getReferrer = (): string => {
  try {
    if (typeof document !== "undefined" && document.referrer) {
      const url = new URL(document.referrer);
      return url.hostname;
    }
  } catch (e) {}
  return "direct";
};

export const sendEvent = async (
  type: string,
  page: string,
  metadata: any = {}
) => {
  const sessionId = getSessionId();
  const timestamp = new Date().toISOString();

  const country = "India";
  const device = navigator.userAgent.includes("Mobi") ? "mobile" : "desktop";
  const browser = navigator.userAgent.includes("Chrome")
    ? "Chrome"
    : navigator.userAgent.includes("Firefox")
    ? "Firefox"
    : navigator.userAgent.includes("Safari")
    ? "Safari"
    : "Unknown";

  const event = {
    type,
    page,
    sessionId,
    timestamp,
    country,
    metadata: {
      device,
      browser,
      referrer: getReferrer(),
      currentUrl: typeof window !== "undefined" ? window.location.href : "N/A",
      ...metadata,
    },
  };

  if (type === "pageview") {
    if (lastPageViewPath === page) {
      console.log(`Skipping duplicate pageview event for: ${page}`);
      return;
    }
    if (pageviewTimeout) {
      clearTimeout(pageviewTimeout);
    }
    lastPageViewPath = page;
    pageviewTimeout = setTimeout(() => {
      lastPageViewPath = null;
    }, PAGEVIEW_DEBOUNCE_DELAY);
  }

  try {
    const response = await fetch("http://localhost:3000/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`Event sent successfully: ${type} - ${page}`);
    } else {
      const errorText = await response.text();
      console.error(
        `Failed to send event: ${type} - ${page}`,
        `Status: ${response.status}`,
        `Status Text: ${response.statusText}`,
        `Response Body: ${errorText}`
      );
    }
  } catch (error) {
    console.error(`Error sending event ${type} - ${page}:`, error);
  }
};

export const sendSessionEnd = async () => {
  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    console.log(`Sending session_end for ${sessionId}...`);
    await sendEvent("session_end", "", {});
    localStorage.removeItem("sessionId");
    console.log(`Session_end sent and sessionId cleared for ${sessionId}.`);
  } else {
    console.log("No active session to end.");
  }
};
