import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import { getSettings, saveSettings, resetSettings } from '../../api/settings';
import '../../styles/pages.css';
import './Settings.css';

const DEFAULT_SETTINGS = {
  teacher: {
    view_density: 'comfortable',
    default_landing: 'dashboard',
    reduce_motion: false,
    show_course_stats: true,
    ai_response_style: 'balanced',
    ai_tone: 'direct',
    ai_creativity: 'balanced',
    ai_citation_mode: 'recommended',
    ai_student_reading_level: 'grade-level',
    ai_feedback_focus: 'historical-thinking',
  },
  student: {
    view_density: 'comfortable',
    default_landing: 'dashboard',
    reduce_motion: false,
    show_due_dates_first: true,
    ai_explanation_style: 'guided',
    ai_tone: 'encouraging',
    ai_help_depth: 'step-by-step',
    ai_source_focus: 'balanced',
    ai_confidence_checks: true,
  },
};

export default function SettingsPage({ user, role }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [settings, setSettings] = useState(() => DEFAULT_SETTINGS[role]);

  useEffect(() => {
    setSettings(DEFAULT_SETTINGS[role]);
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getClassrooms(), getSettings()])
      .then(([{ classrooms: nextClassrooms }, { settings: nextSettings }]) => {
        if (cancelled) return;
        setClassrooms(nextClassrooms || []);
        setSettings({ ...DEFAULT_SETTINGS[role], ...(nextSettings || {}) });
      })
      .catch(() => {
        if (!cancelled) {
          setClassrooms([]);
          setSettings(DEFAULT_SETTINGS[role]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  const pageCopy = useMemo(() => (
    role === 'teacher'
      ? {
          eyebrow: 'Teacher Settings',
          title: 'Workspace and AI Preferences',
          subtitle: 'Control how your teaching workspace looks and how the AI should generate, explain, and evaluate work.',
          sections: teacherSections,
        }
      : {
          eyebrow: 'Student Settings',
          title: 'Study and AI Coach Preferences',
          subtitle: 'Adjust the app for how you like to study, read, and get help from the AI coach.',
          sections: studentSections,
        }
  ), [role]);

  function updateSetting(key, value) {
    setSettings(current => ({ ...current, [key]: value }));
    setSaveState('idle');
  }

  async function handleSave() {
    setSaveState('saving');
    const { settings: savedSettings } = await saveSettings(settings);
    setSettings({ ...DEFAULT_SETTINGS[role], ...(savedSettings || {}) });
    setSaveState('saved');
    window.dispatchEvent(new CustomEvent('epoch:settings-changed', { detail: { role, settings: savedSettings } }));
    window.setTimeout(() => setSaveState(current => current === 'saved' ? 'idle' : current), 2500);
  }

  async function handleReset() {
    setSaveState('saving');
    const { settings: nextSettings } = await resetSettings();
    setSettings(nextSettings);
    setSaveState('saved');
    window.dispatchEvent(new CustomEvent('epoch:settings-changed', { detail: { role, settings: nextSettings } }));
  }

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} role={role} loading={loading} />

        <main className="page-main">
          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">{pageCopy.eyebrow}</p>
              <h1 className="page-title">{pageCopy.title}</h1>
              <p className="page-subtitle">{pageCopy.subtitle}</p>
            </div>
            <div className="settings-page-actions">
              <button className="btn btn-ghost" onClick={handleReset}>Reset Defaults</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </div>

          {saveState !== 'idle' && (
            <div className={`settings-page-notice settings-page-notice--${saveState}`} aria-live="polite">
              {saveState === 'saving' ? 'Saving changes...' : 'Settings saved successfully.'}
            </div>
          )}

          {loading ? (
            <LoadingSpinner fullPage label="Loading settings..." />
          ) : (
            <div className="settings-page-layout">
              <aside className="settings-summary-card">
                <div className="settings-summary-badge">{role === 'teacher' ? 'Teacher' : 'Student'}</div>
                <h2 className="settings-summary-title">{user?.display_name}</h2>
                <p className="settings-summary-copy">
                  {role === 'teacher'
                    ? 'These preferences shape your workspace and establish default AI behavior for teacher-facing tools.'
                    : 'These preferences tailor the layout and define how the AI coach explains, guides, and supports you.'}
                </p>
                <div className="settings-summary-list">
                  <div className="settings-summary-item">
                    <span>Status</span>
                    <strong>{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Ready to edit'}</strong>
                  </div>
                  <div className="settings-summary-item">
                    <span>Workspace</span>
                    <strong>{labelize(settings.view_density)}</strong>
                  </div>
                  <div className="settings-summary-item">
                    <span>AI Style</span>
                    <strong>{labelize(role === 'teacher' ? settings.ai_response_style : settings.ai_explanation_style)}</strong>
                  </div>
                </div>
              </aside>

              <div className="settings-sections">
                {pageCopy.sections.map(section => (
                  <section key={section.title} className="settings-section-card">
                    <div className="settings-section-head">
                      <div>
                        <p className="settings-section-kicker">{section.kicker}</p>
                        <h2 className="settings-section-title">{section.title}</h2>
                      </div>
                      <p className="settings-section-copy">{section.description}</p>
                    </div>

                    <div className="settings-grid">
                      {section.fields.map(field => (
                        <SettingField
                          key={field.key}
                          field={field}
                          value={settings[field.key]}
                          onChange={updateSetting}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function SettingField({ field, value, onChange }) {
  if (field.type === 'toggle') {
    return (
      <div className="settings-field-card">
        <div className="settings-field-top">
          <div>
            <label className="settings-label">{field.label}</label>
            <p className="settings-help">{field.help}</p>
          </div>
          <button
            type="button"
            className={`settings-toggle ${value ? 'settings-toggle--on' : ''}`}
            onClick={() => onChange(field.key, !value)}
            aria-pressed={value}
          >
            <span />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-field-card">
      <label className="settings-label" htmlFor={field.key}>{field.label}</label>
      <p className="settings-help">{field.help}</p>
      <select
        id={field.key}
        className="settings-select"
        value={value}
        onChange={e => onChange(field.key, e.target.value)}
      >
        {field.options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function labelize(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

const teacherSections = [
  {
    kicker: 'Workspace',
    title: 'View Preferences',
    description: 'Set up how your teaching dashboard and classroom pages should feel by default.',
    fields: [
      {
        key: 'view_density',
        label: 'Information Density',
        help: 'Choose how compact course cards, lists, and panels should feel.',
        type: 'select',
        options: [
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
          { value: 'expanded', label: 'Expanded' },
        ],
      },
      {
        key: 'default_landing',
        label: 'Default Landing Page',
        help: 'Decide where your workspace should orient itself first.',
        type: 'select',
        options: [
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'last-course', label: 'Most Recent Course' },
          { value: 'analytics', label: 'Performance First' },
        ],
      },
      {
        key: 'show_course_stats',
        label: 'Show Quick Course Stats',
        help: 'Keep at-a-glance counts and metrics visible in teacher views.',
        type: 'toggle',
      },
      {
        key: 'reduce_motion',
        label: 'Reduce Motion',
        help: 'Use calmer transitions and less interface movement.',
        type: 'toggle',
      },
    ],
  },
  {
    kicker: 'AI',
    title: 'AI Response Preferences',
    description: 'Shape how the teaching AI should draft, explain, and evaluate work, similar to a custom response profile.',
    fields: [
      {
        key: 'ai_response_style',
        label: 'Response Style',
        help: 'Set whether the AI should be concise, balanced, or highly detailed.',
        type: 'select',
        options: [
          { value: 'concise', label: 'Concise' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'detailed', label: 'Detailed' },
        ],
      },
      {
        key: 'ai_tone',
        label: 'Teaching Tone',
        help: 'Control whether AI suggestions sound direct, supportive, or socratic.',
        type: 'select',
        options: [
          { value: 'direct', label: 'Direct' },
          { value: 'supportive', label: 'Supportive' },
          { value: 'socratic', label: 'Socratic' },
        ],
      },
      {
        key: 'ai_creativity',
        label: 'Generation Rigor',
        help: 'Balance safer outputs against more inventive lesson and assessment ideas.',
        type: 'select',
        options: [
          { value: 'conservative', label: 'Conservative' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'creative', label: 'Creative' },
        ],
      },
      {
        key: 'ai_citation_mode',
        label: 'Source and Citation Preference',
        help: 'Tell the AI how much it should anchor responses in evidence and references.',
        type: 'select',
        options: [
          { value: 'recommended', label: 'Recommend Sources' },
          { value: 'cite-when-possible', label: 'Cite When Possible' },
          { value: 'minimal', label: 'Minimal Citation Focus' },
        ],
      },
      {
        key: 'ai_student_reading_level',
        label: 'Default Student Reading Level',
        help: 'Guide AI-generated explanations toward the level you want most often.',
        type: 'select',
        options: [
          { value: 'scaffolded', label: 'Scaffolded' },
          { value: 'grade-level', label: 'Grade Level' },
          { value: 'advanced', label: 'Advanced' },
        ],
      },
      {
        key: 'ai_feedback_focus',
        label: 'Feedback Emphasis',
        help: 'Choose the main lens the AI should prioritize during grading and analysis.',
        type: 'select',
        options: [
          { value: 'historical-thinking', label: 'Historical Thinking' },
          { value: 'writing-quality', label: 'Writing Quality' },
          { value: 'evidence-use', label: 'Evidence Use' },
        ],
      },
    ],
  },
];

const studentSections = [
  {
    kicker: 'Workspace',
    title: 'View Preferences',
    description: 'Tune the student workspace so it is easier to navigate and prioritize your work.',
    fields: [
      {
        key: 'view_density',
        label: 'Information Density',
        help: 'Choose whether class and unit pages feel more open or more compact.',
        type: 'select',
        options: [
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
          { value: 'expanded', label: 'Expanded' },
        ],
      },
      {
        key: 'default_landing',
        label: 'Default Landing Page',
        help: 'Start from your dashboard, your last class, or your most urgent work.',
        type: 'select',
        options: [
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'last-class', label: 'Most Recent Class' },
          { value: 'up-next', label: 'What Is Due Next' },
        ],
      },
      {
        key: 'show_due_dates_first',
        label: 'Prioritize Due Dates',
        help: 'Keep deadlines more visually prominent where possible.',
        type: 'toggle',
      },
      {
        key: 'reduce_motion',
        label: 'Reduce Motion',
        help: 'Use fewer animated transitions across the interface.',
        type: 'toggle',
      },
    ],
  },
  {
    kicker: 'AI Coach',
    title: 'Help Preferences',
    description: 'Decide how the AI coach should explain, guide, and support you while studying.',
    fields: [
      {
        key: 'ai_explanation_style',
        label: 'Explanation Style',
        help: 'Choose whether the AI should guide you gently or explain things more directly.',
        type: 'select',
        options: [
          { value: 'guided', label: 'Guided' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'direct', label: 'Direct' },
        ],
      },
      {
        key: 'ai_tone',
        label: 'Coach Tone',
        help: 'Set how supportive or challenging the AI should sound.',
        type: 'select',
        options: [
          { value: 'encouraging', label: 'Encouraging' },
          { value: 'neutral', label: 'Neutral' },
          { value: 'challenging', label: 'Challenging' },
        ],
      },
      {
        key: 'ai_help_depth',
        label: 'Step-by-Step Support',
        help: 'Control how much the AI breaks work into smaller steps.',
        type: 'select',
        options: [
          { value: 'light', label: 'Light Guidance' },
          { value: 'step-by-step', label: 'Step by Step' },
          { value: 'deep-coaching', label: 'Deep Coaching' },
        ],
      },
      {
        key: 'ai_source_focus',
        label: 'Source-Based Help',
        help: 'Set how strongly the AI should push you back to the text and evidence.',
        type: 'select',
        options: [
          { value: 'balanced', label: 'Balanced' },
          { value: 'source-first', label: 'Source First' },
          { value: 'concept-first', label: 'Concept First' },
        ],
      },
      {
        key: 'ai_confidence_checks',
        label: 'Confidence Checks',
        help: 'Have the AI ask quick check-for-understanding questions before moving on.',
        type: 'toggle',
      },
    ],
  },
];
