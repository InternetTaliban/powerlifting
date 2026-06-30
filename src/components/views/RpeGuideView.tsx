import { SubViewHeader } from './SubViewHeader';

const ROWS: [string, string, string][] = [
  ['10', '0', 'Maximal effort. No more reps could be done.'],
  ['9.5', '0', 'No more reps, but could add slightly more weight.'],
  ['9', '1', 'Could definitely do 1 more rep.'],
  ['8.5', '1–2', 'Could definitely do 1 more rep, maybe 2.'],
  ['8', '2', 'Could definitely do 2 more reps.'],
  ['7.5', '2–3', 'Could definitely do 2 more reps, maybe 3.'],
  ['7', '3', 'Could definitely do 3 more reps. Bar speed is swift.'],
  ['5–6', '4+', 'Warm-up or deload effort. Focus on speed and technique.'],
];

export function RpeGuideView() {
  return (
    <>
      <SubViewHeader title="RPE & RIR Guide" />
      <div className="container">
        <article className="week-card">
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: '20%' }}>RPE</th>
                <th scope="col" style={{ width: '20%' }}>RIR</th>
                <th scope="col" style={{ width: '60%' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([rpe, rir, desc]) => (
                <tr key={rpe}><td>{rpe}</td><td>{rir}</td><td>{desc}</td></tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </>
  );
}
