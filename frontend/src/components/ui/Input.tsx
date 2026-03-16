import type { FC, InputHTMLAttributes, ReactNode } from 'react';
import { useState, useMemo } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input: FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  const isPassword = props.type === 'password';
  const [visible, setVisible] = useState(false);
  const inputType = isPassword && visible ? 'text' : props.type;
  const eyeTitle = visible ? 'Ocultar senha' : 'Mostrar senha';
  const eyeAriaLabel = eyeTitle;
  const eyePath = useMemo(
    () =>
      visible
        ? 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 4a4 4 0 100-8 4 4 0 000 8z'
        : 'M2 3l19 19M11.999 7c-2.209 0-4 1.791-4 4 0 .74.2 1.434.546 2.03m2.03 2.03A3.981 3.981 0 0016 11c0-.74-.2-1.434-.546-2.03M4.5 7.5C6.5 5.5 9 4 12 4s5.5 1.5 7.5 3.5c1.077 1.077 1.958 2.215 2.5 3-.542.785-1.423 1.923-2.5 3C17.5 16.5 15 18 12 18s-5.5-1.5-7.5-3.5c-1.077-1.077-1.958-2.215-2.5-3 .542-.785 1.423-1.923 2.5-3z',
    [visible]
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-3 rounded-lg border
            ${error ? 'border-error focus:ring-error' : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'}
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            text-neutral-900 dark:text-neutral-100
            caret-neutral-900 dark:caret-neutral-100
            placeholder:text-neutral-500 dark:placeholder:text-neutral-400
            bg-white dark:bg-neutral-800
            ${className}
          `}
          {...{
            ...props,
            type: inputType,
            spellCheck: isPassword ? false : props.spellCheck,
            autoComplete: isPassword ? (props.autoComplete || 'current-password') : props.autoComplete,
          }}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors"
            onClick={() => setVisible((v) => !v)}
            aria-label={eyeAriaLabel}
            title={eyeTitle}
            aria-pressed={visible}
          >
            <svg
              className={`w-5 h-5 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={eyePath} />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export { Input };
export default Input;

