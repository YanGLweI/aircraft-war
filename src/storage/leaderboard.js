// localStorage 持久化：排行榜、最高分、设置（主题偏好/音量/静音）。
const LB_KEY = 'aw_leaderboard_v1';
const SET_KEY = 'aw_settings_v1';
const MAX_ENTRIES = 10;

function safeParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function getLeaderboard() {
  const list = safeParse(localStorage.getItem(LB_KEY), []);
  if (!Array.isArray(list)) return [];
  return list.slice().sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}

export function getBestScore() {
  const lb = getLeaderboard();
  return lb.length ? lb[0].score : 0;
}

// 返回该分数是否进入榜单以及名次（1-based，未进榜为 0）
export function qualifies(score) {
  const lb = getLeaderboard();
  if (score <= 0) return 0;
  if (lb.length < MAX_ENTRIES) {
    return lb.filter((e) => e.score >= score).length + 1;
  }
  const worst = lb[lb.length - 1].score;
  if (score > worst) return lb.filter((e) => e.score >= score).length + 1;
  return 0;
}

export function addScore({ name, score, theme, wave }) {
  const lb = getLeaderboard();
  lb.push({
    name: (name || '无名飞行员').slice(0, 12),
    score: Math.floor(score),
    theme: theme || 'cyber',
    wave: wave || 0,
    date: new Date().toISOString().slice(0, 10)
  });
  const sorted = lb.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(sorted));
  } catch {
    /* 存储不可用时静默忽略 */
  }
  return sorted;
}

export function clearLeaderboard() {
  try {
    localStorage.removeItem(LB_KEY);
  } catch {
    /* ignore */
  }
}

const DEFAULT_SETTINGS = { theme: 'cyber', volume: 0.6, muted: false, lastName: '' };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(SET_KEY), {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SET_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
