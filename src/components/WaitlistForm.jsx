import { useEffect, useId, useRef, useState } from 'react';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOW_AFTER_MS = 4000;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Please enter your email address.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.';
  return '';
}

export default function WaitlistForm({ onSubmit }) {
  const id = useId();
  const inputRef = useRef(null);
  const successRef = useRef(null);
  // State updates aren't visible until re-render, so rapid repeat submits need a synchronous guard.
  const inFlightRef = useRef(false);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState('idle');
  const [slow, setSlow] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (status !== 'saving') return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlightRef.current) return;

    setTouched(true);
    setFormError('');
    // Read the live value: autofill tools can fill and submit before a re-render updates `email`.
    const value = inputRef.current?.value ?? email;
    const problem = validateEmail(value);
    setFieldError(problem);
    if (problem) {
      inputRef.current?.focus();
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');
    setSlow(false);
    try {
      await onSubmit({ email: value.trim() });
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      const message = err?.message || 'Something went wrong. Please try again.';
      if (err?.field) {
        setFieldError(message);
        inputRef.current?.focus();
      } else {
        setFormError(message);
      }
    } finally {
      inFlightRef.current = false;
      setSlow(false);
    }
  }

  function handleChange(event) {
    setEmail(event.target.value);
    if (formError) setFormError('');
    if (touched) setFieldError(validateEmail(event.target.value));
  }

  if (status === 'success') {
    return (
      <div className="success" role="status" tabIndex={-1} ref={successRef}>
        <svg className="success__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <p className="success__text">Thank you! You&rsquo;ve been added to the waitlist.</p>
      </div>
    );
  }

  const saving = status === 'saving';
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <form className="waitlist" onSubmit={handleSubmit} noValidate aria-busy={saving}>
      <label className="visually-hidden" htmlFor={`${id}-email`}>
        Email address
      </label>
      <div className={`waitlist__row${fieldError ? ' waitlist__row--invalid' : ''}`}>
        <input
          ref={inputRef}
          id={`${id}-email`}
          className="waitlist__input"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="Enter your email address..."
          maxLength={254}
          value={email}
          onChange={handleChange}
          readOnly={saving}
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby={fieldError ? `${errorId} ${hintId}` : hintId}
        />
        <button className="waitlist__button" type="submit" disabled={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? 'Saving...' : 'Join Waitlist'}
        </button>
      </div>

      <div className="waitlist__messages" aria-live="polite">
        {fieldError && (
          <p className="waitlist__error" id={errorId}>
            {fieldError}
          </p>
        )}
        {formError && (
          <p className="waitlist__error waitlist__error--form" role="alert">
            {formError}
          </p>
        )}
        {saving && slow && <p className="waitlist__slow">Still saving. This is taking longer than usual&hellip;</p>}
      </div>

      <p className="waitlist__hint" id={hintId}>
        Your email is stored only to show this demo working. It&rsquo;s never emailed, sold or shared.{' '}
        <a href="/privacy.html">Privacy note</a>
      </p>
    </form>
  );
}
