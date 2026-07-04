import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { mockEvents } from '../data/mockEvents';

export interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
  totalSeats: number;
  registeredCount: number;
}

export interface Registration {
  registrationId: string;
  eventId: string;
  userId: string;
  email: string;
  registeredAt: string;
  ticketCode: string;
  event?: Event | null;
}

interface EventContextType {
  events: Event[];
  registrations: Registration[];
  loading: boolean;
  error: string | null;
  fetchEvents: (category?: string, search?: string) => Promise<void>;
  getEventById: (id: string) => Promise<Event | null>;
  registerForEvent: (eventId: string) => Promise<Registration>;
  createEvent: (eventData: Omit<Event, 'id' | 'registeredCount'>) => Promise<void>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  fetchUserRegistrations: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL || '';
const MOCK_DATA_MODE = import.meta.env.VITE_USE_MOCK_DATA;
const FORCE_MOCK_DATA = MOCK_DATA_MODE === 'true';
const ALLOW_MOCK_FALLBACK = MOCK_DATA_MODE !== 'false';

const filterMockEvents = (category?: string, search?: string): Event[] => {
  const query = search?.trim().toLowerCase();

  return mockEvents.filter(event => {
    const matchesCategory = !category || event.category === category;
    const matchesSearch =
      !query ||
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });
};

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Headers helper
  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchEvents = async (category?: string, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (FORCE_MOCK_DATA) {
        setEvents(filterMockEvents(category, search));
        return;
      }

      if (!API_BASE_URL) {
        if (ALLOW_MOCK_FALLBACK) {
          setEvents(filterMockEvents(category, search));
          return;
        }

        throw new Error('Chưa cấu hình API endpoint.');
      }

      let url = `${API_BASE_URL}/events`;
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const resJson = await res.json();
      if (resJson.success) {
        const backendEvents = Array.isArray(resJson.data) ? resJson.data : [];
        setEvents(
          backendEvents.length > 0 || !ALLOW_MOCK_FALLBACK
            ? backendEvents
            : filterMockEvents(category, search)
        );
      } else {
        throw new Error(resJson.error || 'Lỗi khi tải danh sách sự kiện.');
      }
    } catch (err: any) {
      setError(err.message);
      if (ALLOW_MOCK_FALLBACK) {
        setEvents(filterMockEvents(category, search));
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventById = async (id: string): Promise<Event | null> => {
    if (FORCE_MOCK_DATA || (!API_BASE_URL && ALLOW_MOCK_FALLBACK)) {
      return mockEvents.find(event => event.id === id) || null;
    }

    if (!API_BASE_URL) {
      return null;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`);
      const resJson = await res.json();
      if (resJson.success) {
        return resJson.data;
      }
      return ALLOW_MOCK_FALLBACK ? mockEvents.find(event => event.id === id) || null : null;
    } catch (err) {
      return ALLOW_MOCK_FALLBACK ? mockEvents.find(event => event.id === id) || null : null;
    }
  };

  const registerForEvent = async (eventId: string): Promise<Registration> => {
    setError(null);
    try {
      // Optimistic UI updates count before call finishes
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registeredCount: e.registeredCount + 1 } : e));

      const res = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      const resJson = await res.json();
      if (resJson.success) {
        const hydratedEvent =
          events.find(event => event.id === eventId) ||
          await getEventById(eventId);

        const nextRegistration: Registration = {
          ...resJson.data,
          event: hydratedEvent
        };

        setRegistrations(prev => {
          const alreadyExists = prev.some(reg => reg.registrationId === nextRegistration.registrationId);
          if (alreadyExists) {
            return prev;
          }

          return [...prev, nextRegistration];
        });

        if (user) {
          void fetchUserRegistrations();
        }

        return nextRegistration;
      } else {
        // Rollback Optimistic UI
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registeredCount: e.registeredCount - 1 } : e));
        throw new Error(resJson.error || 'Đăng ký sự kiện thất bại.');
      }
    } catch (err: any) {
      // Rollback Optimistic UI on network error
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registeredCount: Math.max(0, e.registeredCount - 1) } : e));
      setError(err.message);
      throw err;
    }
  };

  const createEvent = async (eventData: Omit<Event, 'id' | 'registeredCount'>) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEvents(prev => [resJson.data, ...prev]);
      } else {
        throw new Error(resJson.error || 'Không thể tạo sự kiện mới.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<Event>) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEvents(prev => prev.map(e => e.id === id ? resJson.data : e));
      } else {
        throw new Error(resJson.error || 'Cập nhật sự kiện thất bại.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEvents(prev => prev.filter(e => e.id !== id));
        setRegistrations(prev => prev.filter(reg => reg.eventId !== id));
      } else {
        throw new Error(resJson.error || 'Không thể xóa sự kiện.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/registrations`, {
        headers: getHeaders()
      });
      const resJson = await res.json();
      if (resJson.success) {
        setRegistrations(resJson.data);
      } else {
        throw new Error(resJson.error || 'Lỗi tải lịch sử đăng ký.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserRegistrations();
    } else {
      setRegistrations([]);
    }
  }, [user]);

  return (
    <EventContext.Provider value={{
      events,
      registrations,
      loading,
      error,
      fetchEvents,
      getEventById,
      registerForEvent,
      createEvent,
      updateEvent,
      deleteEvent,
      fetchUserRegistrations
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
