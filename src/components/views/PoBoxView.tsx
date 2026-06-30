import { SubViewHeader } from './SubViewHeader';
import { ACCEPTING_IDEAS } from '../../lib/data';

export function PoBoxView() {
  const accepting = ACCEPTING_IDEAS;
  return (
    <>
      <SubViewHeader title="PO Box" />
      <div className="container">
        <article className="pobox-card">
          <header className="pobox-header">
            <h3>Submit an Idea</h3>
            <p className="pobox-subtitle">Have a suggestion for a new feature or program? Send it in.</p>
          </header>

          <fieldset className="pobox-form" disabled={!accepting}>
            <legend className="sr-only">Idea submission form</legend>
            <div className="input-group pobox-input-group">
              <label htmlFor="ideaTitle">Idea Title</label>
              <input type="text" id="ideaTitle" placeholder="e.g. Add a bodyweight program" style={{ width: '100%' }} />
            </div>
            <div className="input-group pobox-input-group">
              <label htmlFor="ideaDesc">Description</label>
              <textarea id="ideaDesc" rows={5} placeholder="Describe your idea in detail…" style={{ width: '100%' }} />
            </div>
            <div className="pobox-footer">
              {!accepting && (
                <p className="pobox-closed-note" id="poboxClosedNote">We are not receiving ideas at the moment.</p>
              )}
              <button
                type="submit"
                className={'btn-progress pobox-submit' + (accepting ? '' : ' disabled')}
                id="poboxSubmit"
                disabled={!accepting}
              >
                Submit Idea
              </button>
            </div>
          </fieldset>
        </article>
      </div>
    </>
  );
}
