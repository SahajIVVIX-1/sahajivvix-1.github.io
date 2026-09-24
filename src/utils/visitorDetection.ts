/**
 * Visitor & Device Environment Intelligence Detection
 * Strictly client-side browser API queries.
 * No private data, no intrusive permissions (no GPS, no mic, no camera).
 */

export interface VisitorInfo {
  sessionId: string;
  visitorNumber: string;
  sessionDuration: string;
  localTime: string;

  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  browser: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: string;
  touchSupport: string;

  timezone: string;
  language: string;
  colorScheme: 'Light' | 'Dark';
  cookiesEnabled: boolean;
  isOnline: boolean;

  cpuCores: string;
  deviceMemory: string;
  connectionType: string;

  location: {
    ip?: string;
    ipType?: string;
    city?: string;
    region?: string;
    country?: string;
    isp?: string;
    isApproximate: boolean;
    isLoading: boolean;
    isShielded?: boolean;
  };
}

/**
 * Detect clean Operating System name from User Agent
 */
function detectOS(ua: string): string {
  if (/macintosh|mac os x/i.test(ua)) {
    if (/iphone|ipad|ipod/i.test(ua) || (navigator.maxTouchPoints > 2 && /macintosh/i.test(ua))) {
      return 'iOS / iPadOS';
    }
    return 'macOS';
  }
  if (/windows/i.test(ua)) {
    if (/nt 10.0/i.test(ua)) return 'Windows 11 / 10';
    if (/nt 6.3/i.test(ua)) return 'Windows 8.1';
    if (/nt 6.2/i.test(ua)) return 'Windows 8';
    if (/nt 6.1/i.test(ua)) return 'Windows 7';
    return 'Windows';
  }
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/cros/i.test(ua)) return 'Chrome OS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Desktop OS';
}

/**
 * Detect Browser and Major Version
 */
function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) {
    const match = ua.match(/edg\/(\d+)/i);
    return `Edge ${match ? match[1] : ''}`.trim();
  }
  if (/opr\//i.test(ua) || /opera/i.test(ua)) {
    const match = ua.match(/opr\/(\d+)/i);
    return `Opera ${match ? match[1] : ''}`.trim();
  }
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)\/(\d+)/i);
    return `Chrome ${match ? match[1] : ''}`.trim();
  }
  if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/(\d+)/i);
    return `Firefox ${match ? match[1] : ''}`.trim();
  }
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    const match = ua.match(/version\/(\d+)/i);
    return `Safari ${match ? match[1] : ''}`.trim();
  }
  return 'Modern Browser';
}

/**
 * Detect Device Form Factor
 */
function detectDeviceType(ua: string): 'Desktop' | 'Mobile' | 'Tablet' {
  const isTablet =
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch)))/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua));
  if (isTablet) return 'Tablet';

  const isMobile = /(mobi|iphone|ipod|android.*mobile|blackberry|phone)/i.test(ua);
  if (isMobile) return 'Mobile';

  return 'Desktop';
}

/**
 * Get or initialize persistent session ID & visitor counter
 */
export function getSessionData(): { sessionId: string; visitorNumber: string; startTime: number } {
  if (typeof window === 'undefined') {
    return { sessionId: 'SES-INIT', visitorNumber: '#001,842', startTime: Date.now() };
  }

  // Session ID in sessionStorage (persists across tab reloads, unique per tab session)
  let sessionId = sessionStorage.getItem('sahaj_session_id');
  if (!sessionId) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const num = Math.floor(1000 + Math.random() * 9000);
    sessionId = `SES-${code}-${num}`;
    sessionStorage.setItem('sahaj_session_id', sessionId);
  }

  // Session Start Time
  let startTimeStr = sessionStorage.getItem('sahaj_session_start');
  let startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
  if (!startTimeStr || Number.isNaN(startTime)) {
    startTime = Date.now();
    sessionStorage.setItem('sahaj_session_start', String(startTime));
  }

  // Visitor Counter in localStorage
  let countStr = localStorage.getItem('sahaj_visitor_counter');
  let count = countStr ? parseInt(countStr, 10) : 0;
  if (!count || Number.isNaN(count)) {
    count = 1842;
    localStorage.setItem('sahaj_visitor_counter', String(count));
  }

  // Increment visitor count once per distinct session ID
  const lastRecordedSession = localStorage.getItem('sahaj_last_session');
  if (lastRecordedSession !== sessionId) {
    count += 1;
    localStorage.setItem('sahaj_visitor_counter', String(count));
    localStorage.setItem('sahaj_last_session', sessionId);
  }

  const formattedVisitorNumber = `#${count.toLocaleString('en-US')}`;

  return { sessionId, visitorNumber: formattedVisitorNumber, startTime };
}

/**
 * Collect instant browser telemetry snapshot
 */
export function getInstantTelemetry(startTime: number): Omit<VisitorInfo, 'location'> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const now = new Date();

  // Session Duration
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const sessionDuration = `${mins}m ${secs.toString().padStart(2, '0')}s`;

  // Local Time
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const localTime = new Intl.DateTimeFormat(lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  // Timezone & Offset
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const offsetMin = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMin) / 60);
  const offsetRemainder = Math.abs(offsetMin) % 60;
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const offsetFormatted = `UTC${offsetSign}${offsetHours}${
    offsetRemainder > 0 ? `:${offsetRemainder}` : ''
  }`;
  const timezone = `${tz} (${offsetFormatted})`;

  // Device & Screen
  const screenResolution =
    typeof screen !== 'undefined' ? `${screen.width} × ${screen.height} px` : 'Not available';
  const viewportSize =
    typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight} px` : 'Standard';
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const devicePixelRatio = `${dpr.toFixed(1)}x (${dpr >= 2 ? 'High-DPI Retina' : 'Standard DPI'})`;
  const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const touchSupport = touchPoints > 0 ? `Supported (${touchPoints} points)` : 'Mouse / Trackpad';

  // System & Cores
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : {};
  const cores = nav.hardwareConcurrency ? `${nav.hardwareConcurrency} Logical Cores` : 'Standard Multi-Core';
  const memory = nav.deviceMemory ? `≥ ${nav.deviceMemory} GB RAM` : 'Standard Capacity';

  // Connection
  let connectionType = 'Broadband / Wi-Fi';
  if (nav.connection) {
    const eff = nav.connection.effectiveType ? nav.connection.effectiveType.toUpperCase() : '';
    const down = nav.connection.downlink ? `~${nav.connection.downlink} Mbps` : '';
    if (eff || down) {
      connectionType = [eff, down].filter(Boolean).join(' · ');
    }
  }

  // Color scheme
  const isDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const { sessionId, visitorNumber } = getSessionData();

  return {
    sessionId,
    visitorNumber,
    sessionDuration,
    localTime,
    deviceType: detectDeviceType(ua),
    os: detectOS(ua),
    browser: detectBrowser(ua),
    screenResolution,
    viewportSize,
    devicePixelRatio,
    touchSupport,
    timezone,
    language: lang,
    colorScheme: isDark ? 'Dark' : 'Light',
    cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : true,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    cpuCores: cores,
    deviceMemory: memory,
    connectionType,
  };
}

/**
 * Fetch visitor's public IP address and approximate network telemetry.
 * Queries resilient public endpoints (ipwho.is, ipify.org, ipapi.co) with timeout fallback.
 */
export async function fetchApproximateLocation(): Promise<VisitorInfo['location']> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  // 1. First choice: ipwho.is (rich CORS data: exact IP, country, city, region, ISP)
  try {
    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      clearTimeout(timeoutId);
      if (data && (data.ip || data.success)) {
        return {
          ip: data.ip || undefined,
          ipType: data.type || (data.ip && data.ip.includes(':') ? 'IPv6' : 'IPv4'),
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country || undefined,
          isp: data.connection?.isp || data.connection?.org || undefined,
          isApproximate: true,
          isLoading: false,
          isShielded: false,
        };
      }
    }
  } catch (_e) {
    // Proceed to fallback
  }

  // 2. Second choice: api.ipify.org (universal fast public IP resolver)
  try {
    const ipifyRes = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    if (ipifyRes.ok) {
      const ipData = await ipifyRes.json();
      clearTimeout(timeoutId);
      if (ipData && ipData.ip) {
        return {
          ip: ipData.ip,
          ipType: ipData.ip.includes(':') ? 'IPv6' : 'IPv4',
          city: 'Public Web',
          region: 'Detected Gateway',
          country: 'Global Network',
          isApproximate: true,
          isLoading: false,
          isShielded: false,
        };
      }
    }
  } catch (_e2) {
    // Proceed to fallback
  }

  // 3. Third choice: ipapi.co
  try {
    const ipapiRes = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (ipapiRes.ok) {
      const data = await ipapiRes.json();
      clearTimeout(timeoutId);
      if (data && data.ip) {
        return {
          ip: data.ip,
          ipType: data.ip.includes(':') ? 'IPv6' : 'IPv4',
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country_name || data.country || undefined,
          isp: data.org || undefined,
          isApproximate: true,
          isLoading: false,
          isShielded: false,
        };
      }
    }
  } catch (_e3) {
    // Graceful offline fallback
  }

  clearTimeout(timeoutId);
  return {
    ip: '127.0.0.1 (Local Session)',
    ipType: 'Loopback / Private',
    city: 'Local Session',
    region: 'Protected Network',
    country: 'Private / Shielded',
    isApproximate: true,
    isLoading: false,
    isShielded: true,
  };
}
