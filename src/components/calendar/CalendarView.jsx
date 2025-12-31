import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  User
} from 'lucide-react';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import './CalendarView.css';

/**
 * CalendarView Component
 *
 * Google Calendar integration with month/week/day views
 */
function CalendarView({ apiKeys }) {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [events, setEvents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
    allDay: false,
    attendees: ''
  });

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load events when account or date changes
  useEffect(() => {
    if (selectedAccountId) {
      loadEvents();
    }
  }, [selectedAccountId, currentDate, viewMode]);

  const loadAccounts = async () => {
    try {
      if (!window.electronAPI?.googleListAccounts) {
        setError('Google Calendar API not available');
        return;
      }

      const result = await window.electronAPI.googleListAccounts();
      const accountsList = result?.success ? (result.data || []) : [];
      setAccounts(accountsList);

      if (accountsList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load Google accounts: ' + err.message);
    }
  };

  const loadEvents = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();

      console.log('[CalendarView] Loading events from', startDate.toISOString(), 'to', endDate.toISOString());

      const result = await window.electronAPI.googleGetEvents(selectedAccountId, {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 250
      });

      console.log('[CalendarView] Received result:', result);

      // Handle both raw array and {success, data} response formats
      const eventsList = Array.isArray(result) ? result : (result?.data || result || []);

      console.log('[CalendarView] Parsed events list:', eventsList, 'Length:', eventsList?.length);

      setEvents(Array.isArray(eventsList) ? eventsList : []);
    } catch (err) {
      console.error('[CalendarView] Failed to load events:', err);
      setError('Failed to load events: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!selectedAccountId) return;

    try {
      setSyncing(true);
      console.log('[CalendarView] Starting calendar sync for account:', selectedAccountId);

      const syncResult = await window.electronAPI.googleSyncCalendar(selectedAccountId);
      console.log('[CalendarView] Sync result:', syncResult);

      await loadEvents();
    } catch (err) {
      console.error('[CalendarView] Failed to sync calendar:', err);
      setError('Failed to sync calendar: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'month') {
      // Get first day of month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      // Get last day of month
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      // Get start of week (Sunday)
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);

      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Single day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { startDate: start, endDate: end };
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    setFormData({
      title: '',
      description: '',
      location: '',
      startDateTime: now.toISOString().slice(0, 16),
      endDateTime: oneHourLater.toISOString().slice(0, 16),
      allDay: false,
      attendees: ''
    });
    setShowCreateModal(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedAccountId || !formData.title.trim()) {
      setError('Please provide at least a title');
      return;
    }

    try {
      const eventData = {
        summary: formData.title,
        description: formData.description,
        location: formData.location,
        start: {
          dateTime: new Date(formData.startDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(formData.endDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      // Add attendees if provided
      if (formData.attendees.trim()) {
        const attendeeEmails = formData.attendees.split(',').map(email => email.trim());
        eventData.attendees = attendeeEmails.map(email => ({ email }));
      }

      await window.electronAPI.googleCreateEvent(selectedAccountId, eventData);

      setShowCreateModal(false);
      await loadEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
      setError('Failed to create event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await window.electronAPI.googleDeleteEvent(selectedAccountId, eventId);
      setShowEventDetail(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event: ' + err.message);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const formatHeaderDate = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const { startDate, endDate } = getDateRange();
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Calculate days from previous month
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

    // Build calendar days
    const calendarDays = [];

    // Previous month days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(prevMonthYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month days
    const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextMonthYear = month === 11 ? year + 1 : year;
      calendarDays.push({
        date: new Date(nextMonthYear, nextMonth, i),
        isCurrentMonth: false
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="calendar-month-view">
        {/* Weekday headers */}
        <div className="calendar-weekday-headers">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday-header">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="calendar-month-grid">
          {calendarDays.map((dayObj, index) => {
            const eventsArray = Array.isArray(events) ? events : [];
            const dayEvents = eventsArray.filter(event => {
              const eventDate = new Date(event.start?.dateTime || event.start?.date);
              return eventDate.toDateString() === dayObj.date.toDateString();
            });

            const isToday = dayObj.date.getTime() === today.getTime();

            return (
              <div
                key={index}
                className={`calendar-day ${!dayObj.isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''}`}
              >
                <div className="calendar-day-number">{dayObj.date.getDate()}</div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="calendar-event-chip"
                      onClick={() => handleEventClick(event)}
                      title={event.summary}
                    >
                      <div className="calendar-event-dot" />
                      <span className="calendar-event-title">{event.summary}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="calendar-event-more">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const { startDate } = getDateRange();
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      weekDays.push(date);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="calendar-week-view">
        {/* Day headers */}
        <div className="calendar-week-headers">
          <div className="calendar-week-time-header">Time</div>
          {weekDays.map(date => (
            <div key={date.toISOString()} className="calendar-week-day-header">
              <div className="calendar-week-day-name">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="calendar-week-day-number">{date.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="calendar-week-grid-container">
          <div className="calendar-week-grid">
            {/* Time column */}
            <div className="calendar-week-times">
              {hours.map(hour => (
                <div key={hour} className="calendar-week-time-slot">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(date => {
              const eventsArray = Array.isArray(events) ? events : [];
              const dayEvents = eventsArray.filter(event => {
                const eventDate = new Date(event.start?.dateTime || event.start?.date);
                return eventDate.toDateString() === date.toDateString();
              });

              return (
                <div key={date.toISOString()} className="calendar-week-day-column">
                  {hours.map(hour => (
                    <div key={hour} className="calendar-week-hour-slot" />
                  ))}

                  {/* Events overlay */}
                  {(Array.isArray(dayEvents) ? dayEvents : []).map(event => {
                    const eventStart = new Date(event.start?.dateTime || event.start?.date);
                    const eventEnd = new Date(event.end?.dateTime || event.end?.date);

                    const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                    const duration = (eventEnd - eventStart) / (1000 * 60 * 60); // hours

                    return (
                      <div
                        key={event.id}
                        className="calendar-week-event"
                        style={{
                          top: `${startHour * 60}px`,
                          height: `${duration * 60}px`
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="calendar-week-event-title">{event.summary}</div>
                        <div className="calendar-week-event-time">
                          {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEventDetailPanel = () => {
    if (!selectedEvent) return null;

    const eventStart = new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date);
    const eventEnd = new Date(selectedEvent.end?.dateTime || selectedEvent.end?.date);

    return (
      <div className="calendar-event-detail-panel">
        <div className="calendar-event-detail-header">
          <h3>{selectedEvent.summary}</h3>
          <button
            className="calendar-event-detail-close"
            onClick={() => setShowEventDetail(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="calendar-event-detail-content">
          <div className="calendar-event-detail-item">
            <Clock size={16} />
            <div>
              <div className="calendar-event-detail-label">Date & Time</div>
              <div className="calendar-event-detail-value">
                {eventStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="calendar-event-detail-value">
                {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {selectedEvent.location && (
            <div className="calendar-event-detail-item">
              <MapPin size={16} />
              <div>
                <div className="calendar-event-detail-label">Location</div>
                <div className="calendar-event-detail-value">{selectedEvent.location}</div>
              </div>
            </div>
          )}

          {selectedEvent.description && (
            <div className="calendar-event-detail-item">
              <div className="calendar-event-detail-label">Description</div>
              <div className="calendar-event-detail-value">{selectedEvent.description}</div>
            </div>
          )}

          {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
            <div className="calendar-event-detail-item">
              <Users size={16} />
              <div>
                <div className="calendar-event-detail-label">Attendees ({selectedEvent.attendees.length})</div>
                <div className="calendar-event-attendees">
                  {selectedEvent.attendees.map((attendee, index) => (
                    <div key={index} className="calendar-event-attendee">
                      <span className="calendar-event-attendee-email">{attendee.email}</span>
                      {attendee.responseStatus && (
                        <span className={`calendar-event-attendee-status calendar-event-attendee-status-${attendee.responseStatus}`}>
                          {attendee.responseStatus}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="calendar-event-detail-actions">
          <Button
            variant="secondary"
            size="small"
            icon={<Trash2 size={16} />}
            onClick={() => handleDeleteEvent(selectedEvent.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  };

  if (accounts.length === 0 && !loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-empty">
          <User size={48} />
          <h3>No Google Accounts Connected</h3>
          <p>Please add a Google account in the Accounts section to use Calendar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h2 className="calendar-title">Calendar</h2>

          {/* Account selector */}
          {accounts.length > 0 && (
            <select
              className="calendar-account-selector"
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="calendar-header-controls">
          {/* Navigation */}
          <div className="calendar-nav">
            <button
              className="calendar-nav-btn"
              onClick={handlePrevious}
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="calendar-today-btn"
              onClick={handleToday}
            >
              Today
            </button>
            <button
              className="calendar-nav-btn"
              onClick={handleNext}
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-header-date">{formatHeaderDate()}</div>

          {/* View switcher */}
          <div className="calendar-view-switcher">
            <button
              className={`calendar-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className={`calendar-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`calendar-view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>

          {/* Actions */}
          <div className="calendar-header-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={syncing ? <RefreshCw size={16} className="spinning" /> : <RefreshCw size={16} />}
              onClick={handleSyncCalendar}
              disabled={syncing || !selectedAccountId}
            >
              Sync
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleCreateEvent}
              disabled={!selectedAccountId}
            >
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="calendar-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Calendar content */}
      <div className="calendar-content">
        {loading ? (
          <div className="calendar-loading">
            <CalendarIcon size={48} className="loading-icon" />
            <p>Loading events...</p>
          </div>
        ) : (
          <>
            <div className="calendar-main">
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && <div className="calendar-day-view">Day view coming soon...</div>}
            </div>

            {/* Event detail panel */}
            {showEventDetail && renderEventDetailPanel()}
          </>
        )}
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Event"
        size="medium"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEvent}>
              Create Event
            </Button>
          </>
        }
      >
        <div className="calendar-event-form">
          <Input
            label="Title"
            type="text"
            placeholder="Event title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="input-container">
            <label className="input-label">Description</label>
            <textarea
              className="input calendar-event-textarea"
              placeholder="Event description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <Input
            label="Location"
            type="text"
            placeholder="Location or meeting link"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <div className="calendar-event-form-row">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
              required
            />

            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
              required
            />
          </div>

          <Input
            label="Attendees"
            type="text"
            placeholder="email@example.com, email2@example.com"
            value={formData.attendees}
            onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
            helperText="Comma-separated email addresses"
          />
        </div>
      </Modal>
    </div>
  );
}

CalendarView.propTypes = {
  apiKeys: PropTypes.object
};

export default CalendarView;
