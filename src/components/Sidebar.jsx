import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getUnits } from '../api/units';
import { getClassrooms } from '../api/classrooms';
import { useAuth } from '../hooks/useAuth';
import './Sidebar.css';

const CLASSROOM_ACCENTS = [
  {
    gradient: 'linear-gradient(135deg, #b5451b, #d4845a)',
    solid: '#b5451b',
    border: 'rgba(212, 132, 90, 0.42)',
    shadow: 'rgba(181, 69, 27, 0.28)',
  },
  {
    gradient: 'linear-gradient(135deg, #1e4d8c, #4a7fc4)',
    solid: '#1e4d8c',
    border: 'rgba(74, 127, 196, 0.4)',
    shadow: 'rgba(30, 77, 140, 0.28)',
  },
  {
    gradient: 'linear-gradient(135deg, #166534, #4ead72)',
    solid: '#166534',
    border: 'rgba(78, 173, 114, 0.42)',
    shadow: 'rgba(22, 101, 52, 0.26)',
  },
  {
    gradient: 'linear-gradient(135deg, #6b21a8, #a855f7)',
    solid: '#6b21a8',
    border: 'rgba(168, 85, 247, 0.42)',
    shadow: 'rgba(107, 33, 168, 0.28)',
  },
  {
    gradient: 'linear-gradient(135deg, #9a3412, #f97316)',
    solid: '#9a3412',
    border: 'rgba(249, 115, 22, 0.42)',
    shadow: 'rgba(154, 52, 18, 0.28)',
  },
];

const sidebarCache = new Map();

function getSidebarCache(cacheKey) {
  if (!sidebarCache.has(cacheKey)) {
    sidebarCache.set(cacheKey, {
      classrooms: [],
      panelId: null,
      panelCollapsed: false,
      unitsByClassroom: new Map(),
    });
  }

  return sidebarCache.get(cacheKey);
}

function getClassroomAccent(index) {
  return CLASSROOM_ACCENTS[((index % CLASSROOM_ACCENTS.length) + CLASSROOM_ACCENTS.length) % CLASSROOM_ACCENTS.length];
}

/**
 * Two-panel sidebar.
 * Rail (52px): one icon per classroom, always visible.
 * Panel (200px): slides in showing units for the selected classroom.
 *
 * Props:
 *   classrooms  – array of { id, name, join_code? }
 *   activeId    – currently selected classroom id
 *   role        – 'teacher' | 'student'
 */
export default function Sidebar({ classrooms = [], activeId, role, loading = false }) {
  const isTeacher = role === 'teacher';
  const classroomBase = isTeacher ? '/teacher/classroom' : '/student/classroom';
  const dashboardPath = isTeacher ? '/teacher' : '/student';
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const cacheKey = `${role}:${user?.id ?? 'anonymous'}`;
  const cache = getSidebarCache(cacheKey);

  // Which classroom's units to show in the panel
  const [displayClassrooms, setDisplayClassrooms] = useState(() => (
    classrooms.length > 0 || !loading ? classrooms : cache.classrooms
  ));
  const [panelId, setPanelId] = useState(() => activeId || cache.panelId || null);
  const [panelCollapsed, setPanelCollapsed] = useState(() => cache.panelCollapsed || false);
  const [units, setUnits] = useState(() => {
    const initialPanelId = activeId || cache.panelId || null;
    return initialPanelId ? cache.unitsByClassroom.get(initialPanelId) || [] : [];
  });
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [panelSnapshot, setPanelSnapshot] = useState(() => {
    const initialPanelId = activeId || cache.panelId || null;
    return (classrooms.length > 0 || cache.classrooms.length > 0)
      ? classrooms.find((classroom) => classroom.id === initialPanelId)
        || cache.classrooms.find((classroom) => classroom.id === initialPanelId)
        || null
      : null;
  });

  useEffect(() => {
    if (classrooms.length > 0 || !loading) {
      setDisplayClassrooms(classrooms);
      cache.classrooms = classrooms;

      if (!loading && classrooms.length === 0) {
        cache.panelId = null;
        cache.panelCollapsed = false;
        cache.unitsByClassroom.clear();
      }
      return;
    }

    if (cache.classrooms.length > 0) {
      setDisplayClassrooms(cache.classrooms);
    }
  }, [cache, classrooms, loading]);

  // Sync panel to activeId when it changes (e.g. navigating via URL)
  useEffect(() => {
    if (!activeId) return;
    setPanelId(activeId);
    cache.panelId = activeId;
  }, [activeId, cache]);

  useEffect(() => {
    if (!panelId) return;
    const panelStillExists = displayClassrooms.some((classroom) => classroom.id === panelId);

    if (!panelStillExists && !loading) {
      setPanelId(null);
      setUnits([]);
      cache.panelId = null;
    }
  }, [cache, displayClassrooms, loading, panelId]);

  useEffect(() => {
    cache.panelId = panelId || null;
  }, [cache, panelId]);

  useEffect(() => {
    cache.panelCollapsed = panelCollapsed;
  }, [cache, panelCollapsed]);

  const panelClassroom = displayClassrooms.find(c => c.id === panelId) || null;

  useEffect(() => {
    if (panelClassroom) {
      setPanelSnapshot(panelClassroom);
    }
  }, [panelClassroom]);

  // Fetch units when panel opens
  useEffect(() => {
    if (!panelId) {
      setUnits([]);
      setUnitsLoading(false);
      return;
    }

    const cachedUnits = cache.unitsByClassroom.get(panelId);
    if (cachedUnits) {
      setUnits(cachedUnits);
      setUnitsLoading(false);
    } else {
      setUnits([]);
      setUnitsLoading(true);
    }

    let cancelled = false;

    getUnits(panelId)
      .then(({ units }) => {
        if (cancelled) return;
        const nextUnits = units || [];
        setUnits(nextUnits);
        cache.unitsByClassroom.set(panelId, nextUnits);
      })
      .catch(() => {
        if (cancelled || cachedUnits) return;
        setUnits([]);
      })
      .finally(() => {
        if (cancelled) return;
        setUnitsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cache, panelId]);

  const showPanel = !!panelClassroom && !panelCollapsed;
  const showUnitSkeleton = unitsLoading && units.length === 0;
  const visiblePanelClassroom = panelClassroom || panelSnapshot;
  const visiblePanelId = panelClassroom?.id || panelSnapshot?.id || panelId;
  const visiblePanelIndex = visiblePanelId
    ? displayClassrooms.findIndex((classroom) => classroom.id === visiblePanelId)
    : -1;
  const visiblePanelAccent = getClassroomAccent(visiblePanelIndex >= 0 ? visiblePanelIndex : 0);

  async function refreshClassroomList() {
    try {
      const { classrooms: nextClassrooms } = await getClassrooms();
      setDisplayClassrooms(nextClassrooms || []);
      cache.classrooms = nextClassrooms || [];
    } catch {
      // Keep the current sidebar state if refresh fails.
    }
  }

  async function refreshPanelUnits(targetPanelId) {
    if (!targetPanelId) return;
    setUnitsLoading(true);
    try {
      const { units: nextUnits } = await getUnits(targetPanelId);
      setUnits(nextUnits || []);
      cache.unitsByClassroom.set(targetPanelId, nextUnits || []);
    } catch {
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }

  useEffect(() => {
    if (!isTeacher) return undefined;

    function handleClassroomsChanged() {
      cache.unitsByClassroom.clear();
      refreshClassroomList();
      if (panelId) {
        refreshPanelUnits(panelId);
      }
    }

    function handleUnitsChanged() {
      cache.unitsByClassroom.clear();
      if (panelId) {
        refreshPanelUnits(panelId);
      }
    }

    window.addEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    window.addEventListener('epoch:units-changed', handleUnitsChanged);

    return () => {
      window.removeEventListener('epoch:classrooms-changed', handleClassroomsChanged);
      window.removeEventListener('epoch:units-changed', handleUnitsChanged);
    };
  }, [cache, isTeacher, panelId]);

  // Detect current unit from path for highlighting
  const pathParts = location.pathname.split('/').filter(Boolean);
  const unitIdx = pathParts.indexOf('unit');
  const currentUnitId = unitIdx !== -1 ? pathParts[unitIdx + 1] : null;

  function handleRailClick(classroomId) {
    if (classroomId === panelId) {
      if (panelCollapsed) {
        setPanelCollapsed(false);
        return;
      }
      // Second click on same — navigate to classroom
      navigate(`${classroomBase}/${classroomId}`);
    } else {
      setPanelId(classroomId);
      setPanelCollapsed(false);
    }
  }

  function getInitials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  }

  // Unit path for students vs teachers
  function unitPath(unitId) {
    return isTeacher
      ? `${classroomBase}/${panelId}/unit/${unitId}`
      : `${classroomBase}/${panelId}/unit/${unitId}`;
  }

  return (
    <div className="sidebar-shell">

      {/* ── Rail ── */}
      <div className="sidebar-rail">
        <div className="rail-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M14.9 9.1 13.1 13.1 9.1 14.9 10.9 10.9 14.9 9.1Z" />
            <path d="M12 4.8v1.7M12 17.5v1.7M4.8 12h1.7M17.5 12h1.7" />
          </svg>
        </div>

        <div className="rail-divider" />

        {/* Classroom icons */}
        <div className="rail-classrooms">
          {displayClassrooms.map((c, index) => {
            const accent = getClassroomAccent(index);
            return (
              <button
                key={c.id}
                className={`rail-item${c.id === panelId ? ' rail-item--active' : ''}`}
                onClick={() => handleRailClick(c.id)}
                title={c.name}
                style={{
                  '--sidebar-accent-bg': accent.gradient,
                  '--sidebar-accent-solid': accent.solid,
                  '--sidebar-accent-border': accent.border,
                  '--sidebar-accent-shadow': accent.shadow,
                }}
              >
                <span className="rail-avatar">{getInitials(c.name)}</span>
              </button>
            );
          })}
          {displayClassrooms.length === 0 && !loading && (
            <div className="rail-empty" title={isTeacher ? 'No classrooms' : 'No classes'}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="10" rx="1.5"/>
                <path d="M5 7h6M5 10h4"/>
              </svg>
            </div>
          )}
        </div>

        {/* Bottom: dashboard icon */}
        <div className="rail-bottom">
          <div className="rail-divider" />
          <button
            className="rail-item"
            onClick={() => navigate(dashboardPath)}
            title="Dashboard"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Panel ── */}
      <div
        className={`sidebar-panel ${showPanel ? 'sidebar-panel--open' : 'sidebar-panel--closed'}`}
        aria-hidden={!showPanel}
      >
        {visiblePanelClassroom && (
          <>
          {/* Classroom header */}
          <div
            className="panel-header"
            onClick={() => navigate(`${classroomBase}/${visiblePanelId}`)}
            style={{
              '--sidebar-accent-bg': visiblePanelAccent.gradient,
              '--sidebar-accent-solid': visiblePanelAccent.solid,
              '--sidebar-accent-border': visiblePanelAccent.border,
              '--sidebar-accent-shadow': visiblePanelAccent.shadow,
            }}
          >
            <div className="panel-classroom-initials">{getInitials(visiblePanelClassroom.name)}</div>
            <div className="panel-classroom-info">
              <div className="panel-classroom-eyebrow">{isTeacher ? 'Classroom' : 'Study Space'}</div>
              <div className="panel-classroom-name">{visiblePanelClassroom.name}</div>
              {isTeacher && visiblePanelClassroom.join_code && (
                <div className="panel-classroom-code">{visiblePanelClassroom.join_code}</div>
              )}
            </div>
            <svg className="panel-header-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </div>

          {/* Units list */}
          <div className="panel-section-label">Units</div>

          <nav className="panel-units" aria-busy={unitsLoading}>
            {showUnitSkeleton && (
              <div className="panel-skeleton" aria-hidden="true">
                <span className="panel-skeleton-row" />
                <span className="panel-skeleton-row" />
                <span className="panel-skeleton-row panel-skeleton-row--short" />
              </div>
            )}

            {!showUnitSkeleton && units.length === 0 && (
              <p className="panel-empty">No units yet.</p>
            )}

            {!showUnitSkeleton && units.map(u => {
              const isActive = u.id === currentUnitId;
              return (
                <NavLink
                  key={u.id}
                  to={unitPath(u.id)}
                  className={`panel-unit${isActive ? ' panel-unit--active' : ''}`}
                >
                  <span className="panel-unit-bar" />
                  <span className="panel-unit-name">{u.title}</span>
                  {!u.is_visible && isTeacher && (
                    <span className="panel-unit-hidden" title="Hidden from students">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M2 2l12 12M6.5 6.6A3 3 0 0 0 9.4 9.5M4.1 4.2C2.7 5.2 1.5 6.5 1 8c1.2 3 4 5 7 5 1.4 0 2.7-.4 3.8-1.1M7 3.1C7.3 3 7.7 3 8 3c3 0 5.8 2 7 5-.4 1-1 1.9-1.8 2.7"/>
                      </svg>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="panel-footer">
            <button
              type="button"
              className="panel-collapse-button"
              onClick={() => setPanelCollapsed(true)}
              aria-label="Collapse units sidebar"
              title="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3 5 8l5 5" />
              </svg>
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
