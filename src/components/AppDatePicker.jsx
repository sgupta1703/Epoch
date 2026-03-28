import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './AppDatePicker.css';

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AppDatePicker({ value, onChange, className = '', placeholder = 'mm/dd/yyyy', ...props }) {
  return (
    <ReactDatePicker
      selected={parseDate(value)}
      onChange={date => onChange(formatDate(date))}
      dateFormat="MM/dd/yyyy"
      placeholderText={placeholder}
      className={`app-date-input ${className}`}
      wrapperClassName="app-date-wrapper"
      popperClassName="app-date-popper"
      showPopperArrow={false}
      {...props}
    />
  );
}
