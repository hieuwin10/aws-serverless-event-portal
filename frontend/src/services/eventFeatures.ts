// Frontend API helpers for new features: Q&A, Lucky Draw, Analytics, Certs & Export
const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// ---- Q&A ----
export const qaApi = {
  getQuestions: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/questions`);
    const j = await res.json();
    return j.success ? (j.data as any[]) : [];
  },
  submitQuestion: async (eventId: string, userName: string, content: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userName, content })
    });
    return res.json();
  },
  upvote: async (eventId: string, questionId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/questions/${questionId}/upvote`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },
  setStatus: async (eventId: string, questionId: string, status: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/questions/${questionId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  addReply: async (eventId: string, questionId: string, content: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/questions/${questionId}/replies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    return res.json();
  }
};

// ---- Lucky Draw ----
export const luckyDrawApi = {
  getCandidates: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/lucky-draw/candidates`, {
      headers: getAuthHeaders()
    });
    const j = await res.json();
    return j.success ? j.data : { candidates: [], winners: [] };
  },
  draw: async (eventId: string, allowMultipleWins = false) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/lucky-draw/draw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ allowMultipleWins })
    });
    return res.json();
  },
  reset: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/lucky-draw/reset`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  }
};

// ---- Analytics ----
export const analyticsApi = {
  getAnalytics: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/analytics`, {
      headers: getAuthHeaders()
    });
    const j = await res.json();
    return j.success ? j.data : null;
  }
};

// ---- Export CSV ----
export const exportCsv = (eventId: string, token?: string) => {
  const headers: Record<string, string> = {};
  const t = token || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (t) headers['Authorization'] = `Bearer ${t}`;
  // Direct browser window navigation for file download
  const a = document.createElement('a');
  a.href = `${API_BASE_URL}/events/${eventId}/export/registrations`;
  a.setAttribute('download', `registrations_${eventId}.csv`);
  // Open in new tab to trigger download (workaround for auth header limitation)
  a.click();
};

// ---- Survey Cron ----
export const surveyCronApi = {
  trigger: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/feedbacks/trigger-survey-cron`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  }
};

// ---- Certificates ----
export const certificatesApi = {
  saveConfig: async (eventId: string, certTemplateUrl: string, certCoordsX: number, certCoordsY: number) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/certificates/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ certTemplateUrl, certCoordsX, certCoordsY })
    });
    return res.json();
  },
  generateAll: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/certificates/generate-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  }
};
