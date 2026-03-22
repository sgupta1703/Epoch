import './LoadingSpinner.css';

/**
 * LoadingSpinner — flexible loading indicator.
 *
 * Props:
 *   size     – 'sm' | 'md' | 'lg'  (default 'md')
 *   fullPage – boolean — centers spinner in the full viewport (default false)
 *   label    – string — optional text shown below the spinner
 */
export default function LoadingSpinner({ size = 'md', fullPage = false, label }) {
  const spinner = (
    <div className={`spinner spinner--${size}`}>
      <div className="spinner-ring" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="spinner-fullpage">{spinner}</div>;
  }

  return spinner;
}