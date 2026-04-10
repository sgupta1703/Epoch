import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function JoinRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = params.get('code');
    if (code) {
      sessionStorage.setItem('pending_join_code', code);
    }
    navigate('/register', { replace: true });
  }, []);

  return <LoadingSpinner fullPage label="Taking you to sign up…" />;
}
