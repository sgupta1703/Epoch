import { useMemo, useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getConversation } from '../../api/personas';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Teacher.css';

function getPersonaAvatar(persona) {
  return persona?.emoji || persona?.name?.trim?.()?.charAt(0)?.toUpperCase() || '?';
}

function getStudentName(student) {
  return student?.display_name || student?.full_name || student?.email || 'Unnamed Student';
}

function getStudentInitial(student) {
  return getStudentName(student).charAt(0).toUpperCase();
}

function modeLabel(mode) {
  return {
    free: 'Free conversation',
    missions: 'Mission-based',
    quiz: 'Quiz after chat',
  }[mode] || 'Free conversation';
}

function formatEra(persona) {
  if (!persona?.year_start && !persona?.location) return '';

  const parts = [];
  if (persona?.year_start) {
    parts.push(persona.year_end ? `${persona.year_start}-${persona.year_end}` : String(persona.year_start));
  }
  if (persona?.location) parts.push(persona.location);

  return parts.join(' | ');
}

export default function PersonaConversationsView({ personas = [], students = [] }) {
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [missionsOpen, setMissionsOpen] = useState(false);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => getStudentName(a).localeCompare(getStudentName(b))),
    [students]
  );

  async function handleSelectConversation(persona, student) {
    setSelectedPersona(persona);
    setSelectedStudent(student);
    setConversation(null);
    setConversationError('');
    setMissionsOpen(false);
    setLoadingConversation(true);

    try {
      const { conversation: nextConversation } = await getConversation(persona.id, student.id);
      setConversation(nextConversation || null);
    } catch {
      setConversationError('Failed to load conversation.');
    } finally {
      setLoadingConversation(false);
    }
  }

  if (personas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">P</div>
        <h3>No personas yet</h3>
        <p>Add personas first before viewing student conversations.</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">S</div>
        <h3>No students enrolled</h3>
        <p>Students must join the classroom before their conversations appear here.</p>
      </div>
    );
  }

  const missions = selectedPersona?.missions || [];
  const completedMissionIds = conversation?.completed_missions || [];
  const allMissionsDone = missions.length > 0 && completedMissionIds.length === missions.length;

  return (
    <div className="pconv-layout">
      <aside className="pconv-sidebar">
        {personas.map(persona => (
          <section key={persona.id} className="pconv-persona-group">
            <div className="pconv-persona-group-header">
              <span className="pconv-persona-emoji">{getPersonaAvatar(persona)}</span>
              <div className="pconv-persona-group-info">
                <div className="pconv-persona-group-name">{persona.name}</div>
                <div className="pconv-persona-group-meta">
                  {formatEra(persona) ? `${formatEra(persona)} | ` : ''}
                  {modeLabel(persona.mode)}
                </div>
              </div>
            </div>

            <div className="pconv-student-list">
              {sortedStudents.map(student => {
                const isActive =
                  selectedPersona?.id === persona.id &&
                  selectedStudent?.id === student.id;

                return (
                  <button
                    key={`${persona.id}-${student.id}`}
                    className={`pconv-student-row${isActive ? ' pconv-student-row--active' : ''}`}
                    onClick={() => handleSelectConversation(persona, student)}
                    type="button"
                  >
                    <div className="pconv-student-avatar">{getStudentInitial(student)}</div>
                    <span className="pconv-student-name">{getStudentName(student)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>

      <section className="pconv-main">
        {!selectedStudent && !selectedPersona && (
          <div className="pconv-empty">
            <div className="pconv-empty-title">Select a conversation</div>
            <div className="pconv-empty-sub">
              Choose a student under any persona to read their transcript.
            </div>
          </div>
        )}

        {(selectedStudent || selectedPersona) && (
          <>
            <div className="pconv-conv-header">
              <div className="pconv-conv-header-left">
                <div className="pconv-conv-title">
                  {getStudentName(selectedStudent)}
                  <span className="pconv-conv-title-sep">with</span>
                  {selectedPersona?.name}
                </div>
                {conversation && (
                  <div className="pconv-conv-meta">
                    {(conversation.turn_count || 0)} exchange{conversation.turn_count === 1 ? '' : 's'}
                    {conversation.completed && <span className="pconv-badge pconv-badge--complete">Complete</span>}
                    {conversation.quiz_locked && <span className="pconv-badge pconv-badge--quiz">Quiz taken</span>}
                    {selectedPersona?.mode === 'missions' && selectedPersona.missions?.length > 0 && (
                      <span className="pconv-badge pconv-badge--missions">
                        {(conversation.completed_missions || []).length}/{selectedPersona.missions.length} missions
                      </span>
                    )}
                  </div>
                )}
              </div>

              {selectedPersona?.mode === 'missions' && missions.length > 0 && (
                <div className="pconv-conv-header-right">
                  <button
                    type="button"
                    className={`missions-fab${allMissionsDone ? ' missions-fab--done' : ''}`}
                    onClick={() => setMissionsOpen(open => !open)}
                  >
                    <span className="missions-fab-icon">🎯</span>
                    <span className="missions-fab-label">Missions</span>
                    <span className={`missions-fab-pill${allMissionsDone ? ' missions-fab-pill--done' : ''}`}>
                      {completedMissionIds.length}/{missions.length}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {selectedPersona?.mode === 'missions' && missions.length > 0 && (
              <>
                {missionsOpen && (
                  <div className="missions-overlay" onClick={() => setMissionsOpen(false)} />
                )}

                <div className={`missions-drawer${missionsOpen ? ' missions-drawer--open' : ''}`}>
                  <div className="missions-drawer-header">
                    <div className="missions-drawer-title">🎯 Missions</div>
                    <button
                      type="button"
                      className="missions-drawer-close"
                      onClick={() => setMissionsOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="missions-drawer-progress">
                    <div className="missions-drawer-progress-text">
                      <span>{completedMissionIds.length} of {missions.length} complete</span>
                      {allMissionsDone && <span className="missions-drawer-done-badge">✓ All done!</span>}
                    </div>
                    <div className="missions-drawer-bar">
                      <div
                        className={`missions-drawer-bar-fill${allMissionsDone ? ' missions-drawer-bar-fill--done' : ''}`}
                        style={{ width: `${missions.length ? (completedMissionIds.length / missions.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="missions-drawer-list">
                    {missions.map((mission, index) => {
                      const isDone = completedMissionIds.includes(mission.id);

                      return (
                        <div
                          key={mission.id}
                          className={`missions-drawer-item${isDone ? ' missions-drawer-item--done' : ''}`}
                        >
                          <div className="missions-drawer-item-left">
                            <div className={`missions-drawer-check${isDone ? ' missions-drawer-check--done' : ''}`}>
                              {isDone ? '✓' : index + 1}
                            </div>
                            <span className="missions-drawer-item-text">{mission.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {allMissionsDone && (
                    <div className="missions-drawer-all-done">
                      This student completed all missions for this conversation.
                    </div>
                  )}
                </div>
              </>
            )}

            {loadingConversation && (
              <div className="pconv-loading">
                <LoadingSpinner label="Loading conversation..." />
              </div>
            )}

            {conversationError && (
              <div className="alert alert-error" style={{ margin: 20 }}>{conversationError}</div>
            )}

            {!loadingConversation && !conversationError && (!conversation || !conversation.messages?.length) && (
              <div className="pconv-empty">
                <div className="pconv-empty-icon">None</div>
                <div className="pconv-empty-title">No conversation yet</div>
                <div className="pconv-empty-sub">
                  {getStudentName(selectedStudent)} has not started chatting with {selectedPersona?.name} yet.
                </div>
              </div>
            )}

            {!loadingConversation && conversation?.messages?.length > 0 && (
              <>
                <div className="pconv-messages">
                  {conversation.messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`pconv-bubble pconv-bubble--${message.role}`}
                    >
                      <div className="pconv-bubble-sender">
                        {message.role === 'user' ? getStudentName(selectedStudent) : selectedPersona?.name}
                      </div>

                      {message.role === 'assistant' ? (
                        <div
                          className="pconv-bubble-text pconv-bubble-text--md"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                        />
                      ) : (
                        <div className="pconv-bubble-text">{message.content}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
