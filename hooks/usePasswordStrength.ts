import { useState, useCallback } from 'react';

type PasswordStrength = 'weak' | 'medium' | 'strong';

export const usePasswordStrength = () => {
  const [strength, setStrength] = useState<PasswordStrength>('weak');
  const [strengthText, setStrengthText] = useState('Слишком простой');

  const calculateStrength = useCallback((password: string) => {
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const length = password.length;

    let score = 0;
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 2;

    if (score >= 4) {
      setStrength('strong');
      setStrengthText('Надежный пароль');
    } else if (score >= 2) {
      setStrength('medium');
      setStrengthText('Средняя сложность');
    } else {
      setStrength('weak');
      setStrengthText('Слишком простой');
    }
  }, []);

  return { strength, strengthText, calculateStrength };
};