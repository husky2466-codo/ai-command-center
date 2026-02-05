import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Video,
  FileText,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Badge from '../shared/Badge';
import meetingService from '../../services/meetingService';
import './Meetings.css';

/**
 * Meetings Component
 *
 * Meeting management system with calendar view, prep sheets, and commitment tracking
 */
function Meetings({ apiKeys }) {
  const [meetings, setMeetings] = useState([]);
  const [groupedMeetings, setGroupedMeetings] = useState({
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
    upcoming: []
  });
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeView, setActiveView] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'prep', 'notes', 'commitments'

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    calendar_link: '',
    status: 'scheduled'
  });

  // Load meetings on mount
  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const grouped = await meetingService.getGrouped();
      setGroupedMeetings(grouped);

      // Set all meetings for search
      const allMeetings = [
        ...grouped.today,
        ...grouped.yesterday,
        ...grouped.thisWeek,
        ...grouped.earlier,
        ...grouped.upcoming
      ];
      setMeetings(allMeetings);
    } catch (err) {
      console.error('Failed to load meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      loadMeetings();
      return;
    }

    try {
      const results = await meetingService.search(query);
      setMeetings(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
    }
  };

  const handleSelectMeeting = async (meetingId) => {
    try {
      const meeting = await meetingService.getByIdWithParticipants(meetingId);
      setSelectedMeeting(meeting);
      setActiveTab('details');
    } catch (err) {
      console.error('Failed to load meeting details:', err);
      setError(err.message);
    }
  };

  const handleCreateMeeting = () => {
    setFormData({
      title: '',
      description: '',
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 60,
      location: '',
      calendar_link: '',
      status: 'scheduled'
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditMeeting = (meeting) => {
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      scheduled_at: meeting.scheduled_at ? new Date(meeting.scheduled_at).toISOString().slice(0, 16) : '',
      duration_minutes: meeting.duration_minutes || 60,
      location: meeting.location || '',
      calendar_link: meeting.calendar_link || '',
      status: meeting.status
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    try {
      if (isEditing && selectedMeeting) {
        await meetingService.update(selectedMeeting.id, formData);
      } else {
        const newMeeting = await meetingService.createWithParticipants(formData, []);
        setSelectedMeeting(newMeeting);
      }

      setIsModalOpen(false);
      await loadMeetings();
    } catch (err) {
      console.error('Failed to save meeting:', err);
      setError(err.message);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      await meetingService.delete(meetingId);
      setSelectedMeeting(null);
      await loadMeetings();
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      setError(err.message);
    }
  };

  const handleGeneratePrepSheet = async () => {
    if (!selectedMeeting) return;

    try {
      const prepSheet = await meetingService.generatePrepSheet(selectedMeeting.id);
      setSelectedMeeting({
        ...selectedMeeting,
        prep_sheet: JSON.stringify(prepSheet)
      });
      setActiveTab('prep');
    } catch (err) {
      console.error('Failed to generate prep sheet:', err);
      setError(err.message);
    }
  };

  const handleExtractCommitments = async () => {
    if (!selectedMeeting || !selectedMeeting.post_notes) return;

    try {
      const commitments = await meetingService.extractCommitments(
        selectedMeeting.id,
        selectedMeeting.post_notes,
        apiKeys
      );

      // Store commitments in state for display
      setSelectedMeeting({
        ...selectedMeeting,
        commitments
      });
      setActiveTab('commitments');
    } catch (err) {
      console.error('Failed to extract commitments:', err);
      setError(err.message);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not scheduled';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderMeetingList = () => {
    const getMeetingsToDisplay = () => {
      if (searchQuery.trim().length > 0) {
        return { 'Search Results': meetings };
      }

      switch (activeView) {
        case 'upcoming':
          return { 'Upcoming': groupedMeetings.upcoming, 'Today': groupedMeetings.today };
        case 'past':
          return {
            'Yesterday': groupedMeetings.yesterday,
            'This Week': groupedMeetings.thisWeek,
            'Earlier': groupedMeetings.earlier
          };
        case 'all':
          return {
            'Upcoming': groupedMeetings.upcoming,
            'Today': groupedMeetings.today,
            'Yesterday': groupedMeetings.yesterday,
            'This Week': groupedMeetings.thisWeek,
            'Earlier': groupedMeetings.earlier
          };
        default:
          return {};
      }
    };

    const meetingGroups = getMeetingsToDisplay();

    return (
      <div className="meetings-list">
        {Object.entries(meetingGroups).map(([groupName, groupMeetings]) => {
          if (!groupMeetings || groupMeetings.length === 0) return null;

          return (
            <div key={groupName} className="meeting-group">
              <h3 className="meeting-group-title">{groupName}</h3>
              <div className="meeting-group-items">
                {groupMeetings.map(meeting => (
                  <Card
                    key={meeting.id}
                    className={`meeting-list-item ${selectedMeeting?.id === meeting.id ? 'meeting-selected' : ''}`}
                    hoverable
                    onClick={() => handleSelectMeeting(meeting.id)}
                  >
                    <div className="meeting-list-item-header">
                      <h4 className="meeting-list-item-title">{meeting.title}</h4>
                      <Badge color={getStatusBadgeColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="meeting-list-item-meta">
                      <div className="meeting-meta-item">
                        <Clock size={14} />
                        <span>{formatDateTime(meeting.scheduled_at)}</span>
                      </div>
                      <div className="meeting-meta-item">
                        <Users size={14} />
                        <span>{meeting.participants?.length || 0} participants</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMeetingDetail = () => {
    if (!selectedMeeting) {
      return (
        <div className="meeting-detail-empty">
          <Calendar size={48} />
          <h3>No meeting selected</h3>
          <p>Select a meeting from the list or create a new one</p>
        </div>
      );
    }

    const parsePrepSheet = () => {
      try {
        return selectedMeeting.prep_sheet ? JSON.parse(selectedMeeting.prep_sheet) : null;
      } catch {
        return null;
      }
    };

    const prepSheet = parsePrepSheet();

    return (
      <div className="meeting-detail">
        {/* Header */}
        <div className="meeting-detail-header">
          <div className="meeting-detail-title-section">
            <h2>{selectedMeeting.title}</h2>
            <Badge color={getStatusBadgeColor(selectedMeeting.status)}>
              {selectedMeeting.status}
            </Badge>
          </div>
          <div className="meeting-detail-actions">
            <Button
              variant="secondary"
              size="small"
              icon={<Edit2 size={16} />}
              onClick={() => handleEditMeeting(selectedMeeting)}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="small"
              icon={<Trash2 size={16} />}
              onClick={() => handleDeleteMeeting(selectedMeeting.id)}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="meeting-detail-tabs">
          <button
            className={`meeting-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText size={16} />
            Details
          </button>
          <button
            className={`meeting-tab ${activeTab === 'prep' ? 'active' : ''}`}
            onClick={() => setActiveTab('prep')}
          >
            <CheckSquare size={16} />
            Prep Sheet
          </button>
          <button
            className={`meeting-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <FileText size={16} />
            Notes
          </button>
          <button
            className={`meeting-tab ${activeTab === 'commitments' ? 'active' : ''}`}
            onClick={() => setActiveTab('commitments')}
          >
            <AlertCircle size={16} />
            Commitments
          </button>
        </div>

        {/* Tab Content */}
        <div className="meeting-detail-content">
          {activeTab === 'details' && (
            <div className="meeting-details-tab">
              <div className="meeting-info-grid">
                <div className="meeting-info-item">
                  <Clock size={16} />
                  <div>
                    <label>Date & Time</label>
                    <p>{formatDateTime(selectedMeeting.scheduled_at)}</p>
                  </div>
                </div>
                <div className="meeting-info-item">
                  <Calendar size={16} />
                  <div>
                    <label>Duration</label>
                    <p>{formatDuration(selectedMeeting.duration_minutes)}</p>
                  </div>
                </div>
                <div className="meeting-info-item">
                  <MapPin size={16} />
                  <div>
                    <label>Location</label>
                    <p>{selectedMeeting.location || 'Not specified'}</p>
                  </div>
                </div>
                {selectedMeeting.calendar_link && (
                  <div className="meeting-info-item">
                    <Video size={16} />
                    <div>
                      <label>Virtual Link</label>
                      <a href={selectedMeeting.calendar_link} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {selectedMeeting.description && (
                <div className="meeting-description">
                  <h4>Description</h4>
                  <p>{selectedMeeting.description}</p>
                </div>
              )}

              <div className="meeting-participants">
                <h4>Participants ({selectedMeeting.participants?.length || 0})</h4>
                <div className="participants-list">
                  {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                    selectedMeeting.participants.map(participant => (
                      <Card key={participant.id} className="participant-card">
                        <div className="participant-info">
                          <div className="participant-avatar">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="participant-details">
                            <h5>{participant.name}</h5>
                            {participant.title && <p className="participant-title">{participant.title}</p>}
                            {participant.email && <p className="participant-email">{participant.email}</p>}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="no-participants">No participants added yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prep' && (
            <div className="meeting-prep-tab">
              {prepSheet ? (
                <div className="prep-sheet">
                  {prepSheet.sections.map((section, index) => (
                    <div key={index} className="prep-section">
                      <h4>{section.title}</h4>
                      {section.content && <pre className="prep-content">{section.content}</pre>}
                      {section.attendees && (
                        <div className="attendee-contexts">
                          {section.attendees.map((attendee, idx) => (
                            <Card key={idx} className="attendee-context-card">
                              <h5>{attendee.name}</h5>
                              {attendee.title && <p className="context-title">{attendee.title} at {attendee.company}</p>}
                              {attendee.context && <p className="context-text">{attendee.context}</p>}
                              {attendee.lastInteraction && (
                                <div className="last-interaction">
                                  <strong>Last interaction:</strong> {attendee.lastInteraction.type} - {new Date(attendee.lastInteraction.date).toLocaleDateString()}
                                </div>
                              )}
                              {attendee.previousMeetings.length > 0 && (
                                <div className="previous-meetings">
                                  <strong>Previous meetings:</strong>
                                  <ul>
                                    {attendee.previousMeetings.map((meeting, mIdx) => (
                                      <li key={mIdx}>
                                        {meeting.title} - {new Date(meeting.scheduled_at).toLocaleDateString()}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prep-sheet-empty">
                  <FileText size={48} />
                  <h4>No prep sheet generated</h4>
                  <p>Generate a prep sheet to see attendee context and talking points</p>
                  <Button
                    variant="primary"
                    onClick={handleGeneratePrepSheet}
                    disabled={!selectedMeeting.participants || selectedMeeting.participants.length === 0}
                  >
                    Generate Prep Sheet
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="meeting-notes-tab">
              <textarea
                className="meeting-notes-textarea"
                placeholder="Add post-meeting notes here..."
                value={selectedMeeting.post_notes || ''}
                onChange={(e) => {
                  setSelectedMeeting({ ...selectedMeeting, post_notes: e.target.value });
                  // Auto-save debounced
                  clearTimeout(window.notesTimeout);
                  window.notesTimeout = setTimeout(() => {
                    meetingService.updateNotes(selectedMeeting.id, e.target.value);
                  }, 2000);
                }}
              />
              <Button
                variant="secondary"
                onClick={handleExtractCommitments}
                disabled={!selectedMeeting.post_notes}
              >
                Extract Commitments
              </Button>
            </div>
          )}

          {activeTab === 'commitments' && (
            <div className="meeting-commitments-tab">
              {selectedMeeting.commitments && selectedMeeting.commitments.length > 0 ? (
                <div className="commitments-list">
                  {selectedMeeting.commitments.map(commitment => (
                    <Card key={commitment.id} className="commitment-card">
                      <div className="commitment-description">{commitment.description}</div>
                      {commitment.assignee && (
                        <div className="commitment-assignee">Assignee: @{commitment.assignee}</div>
                      )}
                      {commitment.dueDate && (
                        <div className="commitment-due">Due: {commitment.dueDate}</div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="commitments-empty">
                  <AlertCircle size={48} />
                  <h4>No commitments extracted</h4>
                  <p>Add meeting notes and extract commitments to track action items</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="meetings-container">
        <div className="meetings-loading">
          <Calendar size={48} className="loading-icon" />
          <p>Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meetings-container">
      {/* Sidebar */}
      <div className="meetings-sidebar">
        <div className="meetings-sidebar-header">
          <h2>Meetings</h2>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleCreateMeeting}
            size="small"
          >
            New
          </Button>
        </div>

        {/* Search */}
        <div className="meetings-search">
          <Input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        {/* View Toggle */}
        <div className="meetings-view-toggle">
          <button
            className={`view-toggle-btn ${activeView === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveView('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`view-toggle-btn ${activeView === 'past' ? 'active' : ''}`}
            onClick={() => setActiveView('past')}
          >
            Past
          </button>
          <button
            className={`view-toggle-btn ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            All
          </button>
        </div>

        {/* Meeting List */}
        {renderMeetingList()}
      </div>

      {/* Main Detail Area */}
      <div className="meetings-main">
        {error && (
          <div className="meetings-error">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        {renderMeetingDetail()}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Meeting' : 'New Meeting'}
        size="medium"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveMeeting}>
              {isEditing ? 'Save Changes' : 'Create Meeting'}
            </Button>
          </>
        }
      >
        <div className="meeting-form">
          <Input
            label="Title"
            type="text"
            placeholder="Meeting title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Input
            label="Description"
            type="textarea"
            placeholder="Meeting description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            required
          />

          <Input
            label="Duration (minutes)"
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            min="15"
            step="15"
          />

          <Input
            label="Location"
            type="text"
            placeholder="Office, Zoom, etc."
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Input
            label="Virtual Link"
            type="url"
            placeholder="https://zoom.us/..."
            value={formData.calendar_link}
            onChange={(e) => setFormData({ ...formData, calendar_link: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}

Meetings.propTypes = {
  apiKeys: PropTypes.object
};

export default Meetings;
