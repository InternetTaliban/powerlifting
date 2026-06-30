import { useRef, useState } from 'react';
import { SubViewHeader } from './SubViewHeader';
import { ACCEPTING_IDEAS } from '../../lib/data';
import { submitIdea, readRateRecord, msUntilNextAllowed, TITLE_MAX, DESCRIPTION_MAX } from '../../lib/poBox';

type Status = 'idle' | 'sending' | 'sent' | 'error';

function formatWait(ms: number): string {
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return hours <= 1 ? 'about an hour' : `about ${hours} hours`;
}

export function PoBoxView() {
  const accepting = ACCEPTING_IDEAS;
  const mountedAt = useRef(Date.now());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  // Advisory cooldown read off the device clock just to pre-fill the UI; the
  // authoritative check runs on submit against real network time, so a fiddled
  // clock can't actually open the form early.
  const advisoryWait = msUntilNextAllowed(readRateRecord(), Date.now());
  const onCooldown = status !== 'sent' && status !== 'error' && advisoryWait > 0;

  const sending = status === 'sending';
  const sent = status === 'sent';
  const disabled = !accepting || sending || sent || onCooldown;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    const outcome = await submitIdea({ title, description, honeypot, dwellMs: Date.now() - mountedAt.current });
    if (outcome.ok) {
      setStatus('sent');
      setMessage('Thanks! Your idea is on its way.');
    } else {
      setStatus('error');
      setMessage(outcome.reason);
    }
  };

  return (
    <>
      <SubViewHeader title="PO Box" />
      <div className="container">
        <article className="pobox-card">
          <header className="pobox-header">
            <h3>Submit an Idea</h3>
            <p className="pobox-subtitle">Have a suggestion for a new feature or program? Send it in.</p>
          </header>

          <form className="pobox-form" onSubmit={onSubmit}>
            <fieldset className="pobox-fieldset" disabled={disabled}>
              <legend className="sr-only">Idea submission form</legend>
              <div className="input-group pobox-input-group">
                <label htmlFor="ideaTitle">Idea Title</label>
                <input
                  type="text" id="ideaTitle" value={title} maxLength={TITLE_MAX}
                  placeholder="e.g. Add a bodyweight program" style={{ width: '100%' }}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="input-group pobox-input-group">
                <label htmlFor="ideaDesc">Description</label>
                <textarea
                  id="ideaDesc" rows={5} value={description} maxLength={DESCRIPTION_MAX}
                  placeholder="Describe your idea in detail…" style={{ width: '100%' }}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {/* Honeypot: hidden from people, irresistible to bots. A filled value is rejected. */}
              <input
                type="text" className="pobox-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={honeypot} placeholder="Your website" onChange={(e) => setHoneypot(e.target.value)}
              />
            </fieldset>

            <div className="pobox-footer">
              {!accepting && (
                <p className="pobox-closed-note">We are not receiving ideas at the moment.</p>
              )}
              {accepting && sent && <p className="pobox-status pobox-status--ok">{message}</p>}
              {accepting && status === 'error' && <p className="pobox-status pobox-status--error">{message}</p>}
              {accepting && onCooldown && !sent && (
                <p className="pobox-closed-note">
                  You&apos;ve already sent an idea today. Check back in {formatWait(advisoryWait)}.
                </p>
              )}
              <button type="submit" className="btn-progress pobox-submit" disabled={disabled}>
                {sending ? 'Sending…' : sent ? 'Sent' : 'Submit Idea'}
              </button>
            </div>
          </form>
        </article>
      </div>
    </>
  );
}
