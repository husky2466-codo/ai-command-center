import React from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import Card from '../../shared/Card';

/**
 * TodaysMeetingsWidget - Today's meetings with times
 */
function TodaysMeetingsWidget({ meetings, onNavigate }) {
  if (!meetings) return null;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleMeetingClick = (meeting) => {
    if (onNavigate) {
      onNavigate('meetings', { meetingId: meeting.id });
    }
  };

  return (
    <Card
      title="Today's Meetings"
      className="todays-meetings-widget"
      variant="default"
      padding="md"
      hoverable
    >
      <div className="widget-icon">
        <Calendar size={20} />
      </div>

      {meetings.meetings.length === 0 ? (
        <div className="widget-empty">
          <p>No meetings scheduled for today</p>
        </div>
      ) : (
        <div className="meetings-list">
          {meetings.meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="meeting-item"
              onClick={() => handleMeetingClick(meeting)}
            >
              <div className="meeting-time">
                <Clock size={16} />
                <span>{formatTime(meeting.start_time)}</span>
              </div>
              <div className="meeting-details">
                <span className="meeting-title">{meeting.title}</span>
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="meeting-participants">
                    <Users size={14} />
                    <span>{meeting.participants.length} participants</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meetings.count > 0 && (
        <div className="widget-footer">
          <span className="widget-count">{meetings.count} meetings</span>
          <button
            className="btn-link"
            onClick={() => onNavigate && onNavigate('meetings')}
          >
            View calendar
          </button>
        </div>
      )}
    </Card>
  );
}

export default TodaysMeetingsWidget;
