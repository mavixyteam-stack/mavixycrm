'use client'
import { money, intensityMeta, monthTotal, deckTotal, DEFAULT_CAPABILITIES } from '@/lib/proposal'
import type { ProposalDeck } from '@/types'

function k(n: number): string {
  if (!n) return '—'
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`
  return `₹${n}`
}

const SPARK = '807 75.9 49.5 49.5'
const SPARK_PATH = 'M831.88,125.05h0c0-13.49-10.94-24.42-24.42-24.42h0c13.49,0,24.42-10.94,24.42-24.43h0c0,13.49,10.94,24.42,24.42,24.42h0c-13.49,0-24.42,10.94-24.42,24.43Z'
const WORD_VB = '0 0 856.31 177.26'
const WORD_PATH = 'M0,3.64h36.67v121.41H0V3.64ZM73.09,0c23.31,0,38.61,20.4,38.61,51.24v73.82h-36.42V51.24c0-11.66-6.07-19.43-16.03-19.43s-15.78,9.23-15.78,21.85h-6.8C36.67,22.34,50.99,0,73.09,0ZM134.52,31.81c-9.47,0-15.78,9.23-15.78,21.85h-7.04c0-31.32,14.57-53.66,36.42-53.66,23.55,0,38.85,20.4,38.85,51.24v73.82h-36.67V51.24c0-11.66-6.07-19.43-15.78-19.43Z M202.26,64.1C202.26,28.65,228.49,0,264.18,0c16.51,0,29.87,7.04,38.85,19.43V3.64h36.67v121.41h-36.67v-60.95c0-17.48-13.84-31.08-33.02-31.08s-31.08,14.08-31.08,31.32,11.66,30.35,29.14,30.35c16.27,0,28.17-13.36,28.17-30.59h6.8c0,38.85-15.3,62.65-40.79,64.35-35.45,2.67-59.98-28.65-59.98-64.35Z M351.59,3.64h39.09l26.71,78.43L444.35,3.64h39.09l-44.19,121.41h-43.46L351.59,3.64Z M495.83,39.23h36.67v85.82h-36.67V39.23Z M495.83,3.64h36.67v25.72h-36.67V3.64Z M599.75,59.49c-7.77,6.8-16.03,9.23-23.31,7.28-14.33-3.64-25.5-24.53-25.5-63.13h37.88c0,21.61,3.16,34.24,8.5,36.91,3.64,1.94,9.47.49,14.33-5.34l4.13,2.91,25.98-34.48h42.01l-42.74,56.82c8.26-4.13,16.03-4.37,22.82-.73,13.36,7.53,22.34,29.62,22.34,65.32h-37.88c0-29.87-4.61-44.68-10.93-47.84-4.13-2.19-9.47.49-14.33,7.28l-30.59,40.55h-42.01l49.29-65.56Z M692.75,137.68c0-22.83,15.06-37.64,35.69-37.88,7.53,0,14.08,3.16,18.7,8.01L702.7,3.64h36.67l30.35,79.16,27.2-79.16h34.97l-43.95,123.35c-10.44,29.14-29.38,50.26-52.69,50.26-25.01,0-42.49-17.97-42.49-39.58ZM735,145.93c8.26,0,15.54-8.01,19.43-18.94l.73-1.94h-7.77c-1.94-4.13-5.83-8.01-12.38-7.77-7.77.49-13.84,6.56-13.84,15.54,0,7.04,5.59,13.11,13.84,13.11Z M831.88,125.05h0c0-13.49-10.94-24.42-24.42-24.42h0c13.49,0,24.42-10.94,24.42-24.43h0c0,13.49,10.94,24.42,24.42,24.42h0c-13.49,0-24.42,10.94-24.42,24.43Z'

function Word({ fill }: { fill: string }) {
  return <svg className="word" viewBox={WORD_VB} fill={fill} aria-label="Mavixy"><path d={WORD_PATH} /></svg>
}

export default function ProposalDeckView({ deck }: { deck: ProposalDeck }) {
  const months = deck.months || []
  const services = deck.services || []
  const caps = (deck.capabilities && deck.capabilities.length ? deck.capabilities : DEFAULT_CAPABILITIES).slice(0, 5)
  const total = deckTotal(deck)

  // Per-month top services (by intensity) for the phase cards.
  const phaseMix = months.map((_m, mi) =>
    services
      .map(s => ({ name: s.name, intensity: s.cells?.[mi]?.intensity || 0 }))
      .filter(x => x.intensity > 0)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 4)
  )

  return (
    <div className="mvx-deck">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap" />
      <style>{CSS}</style>
      <div className="wrap">
        <div className="bar">
          <div className="brand"><Word fill="var(--ink)" /><small>Creative · Marketing · Technology</small></div>
        </div>

        {/* cover */}
        <div className="cover">
          <div className="cover-top">
            <Word fill="#F5EDE1" />
            <div className="cover-date">Proposal</div>
          </div>
          <div className="cover-mid">
            <div className="cover-eye">
              <svg className="spark" viewBox={SPARK} fill="#FF5A00"><path d={SPARK_PATH} /></svg>
              <span>Proposal for</span>
            </div>
            <h1>{deck.clientName}<span>.</span></h1>
            <div className="rule" />
            {(deck.promiseHeadline || deck.promiseText) && (
              <div>
                {deck.promiseHeadline && <div className="promise-h">{deck.promiseHeadline}</div>}
                {deck.promiseText && <p className="promise">{deck.promiseText}</p>}
              </div>
            )}
          </div>
          <div className="meta">
            <div><div className="eyebrow">Prepared for</div><div className="mk">{deck.clientName}</div>{deck.clientTagline && <div className="ms">{deck.clientTagline}</div>}</div>
            <div><div className="eyebrow">Prepared by</div><div className="mk">Mavixy</div><div className="ms">Creative · Marketing · Technology</div></div>
            <div><div className="eyebrow">Contact</div><div className="ms" style={{ marginTop: 8 }}>hey@mavixy.com<br />+91 96117 79996<br />www.mavixy.com</div></div>
          </div>
        </div>

        {/* opportunity */}
        {(deck.opportunityHeadline || deck.opportunityBody) && (
          <section>
            <div className="shead"><span className="ix">01</span><span className="eyebrow">The opportunity</span></div>
            {deck.opportunityHeadline && <h2 className="title">{deck.opportunityHeadline}</h2>}
            {deck.opportunityBody && <p className="lede">{deck.opportunityBody}</p>}
            {deck.assets && deck.assets.length > 0 && (
              <div className="grid-hair assets" style={{ marginTop: 28 }}>
                {deck.assets.slice(0, 4).map((a, i) => (
                  <div key={i} className="cell-w">
                    <svg className="ic" viewBox={SPARK} fill="currentColor"><path d={SPARK_PATH} /></svg>
                    <h3>{a.label}</h3>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* capabilities */}
        <section>
          <div className="shead"><span className="ix">02</span><span className="eyebrow">What Mavixy does</span></div>
          <h2 className="title">One partner. Every capability.</h2>
          <div className="grid-hair caps" style={{ marginTop: 28 }}>
            {caps.map((c, i) => (
              <div key={i} className="cell-w">
                <svg className="ic" viewBox={SPARK} fill="currentColor"><path d={SPARK_PATH} /></svg>
                <h3>{c.title}</h3>
                <ul>{(c.items || []).slice(0, 4).map((it, j) => <li key={j}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* the plan — intensity matrix */}
        {services.length > 0 && months.length > 0 && (
          <section>
            <div className="shead"><span className="ix">03</span><span className="eyebrow">The plan</span></div>
            <h2 className="title">Depth that moves with the goal.</h2>
            <p className="lede">Every service runs at a different intensity each month. As the plan shifts objective, effort — and cost — moves with it. Built for {deck.clientName}, not off a price list.</p>
            <div className="matrix-shell" style={{ marginTop: 28 }}>
              <table className="matrix">
                <thead>
                  <tr>
                    <th className="svc"><span className="eyebrow">Service</span></th>
                    {months.map((m, i) => <th key={i}><span className="mk">{m.key}</span><span className="mf">{m.focus}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, si) => (
                    <tr key={si}>
                      <td className="svc"><span className="dot" />{s.name}</td>
                      {months.map((_m, mi) => {
                        const cell = s.cells?.[mi] || { intensity: 0, price: 0 }
                        const im = intensityMeta(cell.intensity)
                        return (
                          <td key={mi} className="cell">
                            <div className={`lvl ${im.h}`}><span className="l">{im.label}</span><span className="v num">{k(cell.price)}</span></div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="svc">Monthly investment</td>
                    {months.map((_m, mi) => <td key={mi}><span className="tot num">{money(monthTotal(deck, mi))}</span><small>+ GST</small></td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="legend">
              {intensityLegend.map(l => <span key={l.h} className="k"><span className="sw" style={{ background: `var(--${l.h})` }} />{l.label}</span>)}
            </div>
          </section>
        )}

        {/* phase cards */}
        {months.length > 0 && (
          <section>
            <div className="shead"><span className="ix">04</span><span className="eyebrow">Month by month</span></div>
            <h2 className="title">One plan, one direction.</h2>
            <div className="phases" style={{ marginTop: 28 }}>
              {months.map((m, mi) => (
                <div key={mi} className="phase">
                  <span className="pk">{m.key}</span>
                  <h3>{m.focus}</h3>
                  {m.objective && <p className="obj">{m.objective}</p>}
                  <div className="mix">
                    {phaseMix[mi].map((x, j) => (
                      <div key={j} className="mixrow"><span>{x.name}</span><span className="bars">{[0, 1, 2, 3].map(b => <i key={b} className={b < x.intensity ? 'on' : ''} />)}</span></div>
                    ))}
                  </div>
                  <div className="price"><span className="amt num">{money(monthTotal(deck, mi))}<span> + GST</span></span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* total */}
        {total > 0 && (
          <section>
            <div className="total">
              <div>
                <span className="eyebrow">Total engagement{months.length ? ` · ${months.length} month${months.length > 1 ? 's' : ''}` : ''}</span>
                <div className="big num">{money(total)}<span> + GST</span></div>
              </div>
              <p className="rt">{deck.gstNote || 'Service fees only. Ad spend is separate and paid directly to the platforms.'}</p>
            </div>
          </section>
        )}

        {/* extras */}
        {(deck.extras || []).map((ex, i) => (
          <section key={i}>
            <div className="shead"><span className="ix">{String(5 + i).padStart(2, '0')}</span><span className="eyebrow">{ex.heading}</span></div>
            {ex.body && <p className="lede">{ex.body}</p>}
            {ex.bullets && ex.bullets.length > 0 && (
              <div className="grid-hair" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 22 }}>
                {ex.bullets.map((b, j) => <div key={j} className="cell-w"><h3 style={{ fontSize: 14 }}>{b}</h3></div>)}
              </div>
            )}
          </section>
        ))}

        {/* closing */}
        <section className="close">
          <div className="shead"><span className="ix">{String(5 + (deck.extras?.length || 0)).padStart(2, '0')}</span><span className="eyebrow">Let&apos;s build it</span></div>
          <h2>{deck.closingHeadline || `Let's build the digital ${deck.clientName}.`}</h2>
          <div className="contact">
            <div><div className="eyebrow">Contact</div><p className="mono" style={{ marginTop: 8 }}>hey@mavixy.com<br />+91 96117 79996<br />www.mavixy.com</p></div>
            <div><div className="eyebrow">Studio</div><p className="mono" style={{ marginTop: 8 }}>475, 2nd Floor, Croissance Hub,<br />RBI Layout, JP Nagar 7th Phase,<br />Bengaluru 560078</p></div>
          </div>
        </section>

        <footer><span>Confidential · Mavixy 2026</span><span>{deck.clientName} × Mavixy</span></footer>
      </div>
    </div>
  )
}

const intensityLegend = [
  { h: 'h0', label: 'Off' }, { h: 'h1', label: 'Light' }, { h: 'h2', label: 'Medium' }, { h: 'h3', label: 'Heavy' }, { h: 'h4', label: 'Max' },
]

const CSS = `
.mvx-deck{
  --paper:#F5EDE1;--ink:#14110E;--body:#3A342C;--muted:#6B6153;--muted-2:#8B8073;
  --line:#D6C7B0;--line-soft:#E4D8C4;--spark:#FF5A00;
  --dark:#100E0C;--on-dark:#F5EDE1;--on-dark-dim:#B7AC9C;--on-dark-muted:#8B8073;--divider-dark:#332E28;
  --h0:#EADFCD;--h1:#FFEADD;--h2:#FFD3B4;--h3:#FF9E6B;--h4:#FF5A00;
  --on-h-lo:#8B4A1E;--on-h-mid:#4A2208;--on-h-hi:#F5EDE1;
  --dsp:"Archivo",system-ui,sans-serif;--bdy:"Instrument Sans",system-ui,sans-serif;
  background:var(--paper);color:var(--body);font-family:var(--bdy);font-size:15px;line-height:1.62;-webkit-font-smoothing:antialiased;
}
.mvx-deck *{box-sizing:border-box}
.mvx-deck .wrap{max-width:1040px;margin:0 auto;padding-inline:22px}
.mvx-deck h1,.mvx-deck h2,.mvx-deck h3{font-family:var(--dsp);color:var(--ink);margin:0;text-wrap:balance}
.mvx-deck p{margin:0}
.mvx-deck .num{font-variant-numeric:tabular-nums}
.mvx-deck .word{height:19px;width:auto;display:block}
.mvx-deck .eyebrow{font-family:var(--bdy);font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.mvx-deck .ix{font-family:var(--dsp);font-weight:800;font-size:13px;color:var(--spark);letter-spacing:.02em}
.mvx-deck .bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:20px}
.mvx-deck .brand{display:flex;align-items:center;gap:10px;color:var(--ink)}
.mvx-deck .brand small{font-family:var(--bdy);font-weight:600;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-2)}
.mvx-deck section{padding-block:clamp(40px,6vw,72px);border-top:1px solid var(--line-soft)}
.mvx-deck .shead{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
.mvx-deck h2.title{font-weight:800;font-size:clamp(28px,4.4vw,41px);line-height:1.02;letter-spacing:-.035em;max-width:17ch}
.mvx-deck .lede{color:var(--body);font-size:clamp(15px,1.5vw,16.5px);line-height:1.68;max-width:60ch;margin-top:14px}
.mvx-deck .cover{background:var(--dark);color:var(--on-dark);border-radius:22px;overflow:hidden;position:relative;padding:clamp(30px,4.6vw,52px);margin-top:8px;display:flex;flex-direction:column;gap:clamp(26px,4vw,42px)}
.mvx-deck .cover::after{content:"";position:absolute;right:-140px;top:-100px;width:380px;height:380px;background:radial-gradient(circle,rgba(255,90,0,.20),transparent 65%);pointer-events:none}
.mvx-deck .cover-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;position:relative;z-index:1}
.mvx-deck .cover-top .word{height:26px}
.mvx-deck .cover-date{font-family:var(--bdy);font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--on-dark-muted)}
.mvx-deck .cover-mid{position:relative;z-index:1;display:flex;flex-direction:column;gap:22px}
.mvx-deck .cover-eye{display:flex;align-items:center;gap:10px}
.mvx-deck .cover-eye .spark{width:13px;height:13px}
.mvx-deck .cover-eye span{font-family:var(--bdy);font-weight:600;font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--spark)}
.mvx-deck .cover h1{font-family:var(--dsp);font-weight:800;color:var(--on-dark);font-size:clamp(48px,9.5vw,86px);line-height:.9;letter-spacing:-.042em}
.mvx-deck .cover h1 span{color:var(--spark)}
.mvx-deck .rule{height:1px;background:var(--divider-dark)}
.mvx-deck .promise-h{font-family:var(--dsp);font-weight:700;font-size:clamp(16px,2vw,19px);letter-spacing:-.02em;color:var(--on-dark)}
.mvx-deck .promise{max-width:46ch;font-size:15px;line-height:1.65;color:var(--on-dark-dim);margin-top:11px}
.mvx-deck .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border-top:1px solid var(--divider-dark);padding-top:22px;position:relative;z-index:1}
.mvx-deck .meta .eyebrow{color:#7A6F62}
.mvx-deck .meta .mk{font-family:var(--dsp);font-weight:700;font-size:14px;letter-spacing:-.01em;color:var(--on-dark);margin-top:8px}
.mvx-deck .meta .ms{font-size:12px;color:var(--on-dark-muted);line-height:1.6;margin-top:3px}
.mvx-deck .grid-hair{display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}
.mvx-deck .assets{grid-template-columns:repeat(4,1fr)}
.mvx-deck .caps{grid-template-columns:repeat(5,1fr)}
.mvx-deck .cell-w{background:var(--paper);padding:22px 18px;display:flex;flex-direction:column;gap:12px}
.mvx-deck .cell-w .ic{width:20px;height:20px;color:var(--spark)}
.mvx-deck .cell-w h3{font-family:var(--dsp);font-weight:700;font-size:15.5px;letter-spacing:-.02em}
.mvx-deck .cell-w ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.mvx-deck .cell-w li{font-size:12px;color:var(--muted);line-height:1.35}
.mvx-deck .matrix-shell{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--paper)}
.mvx-deck .matrix{min-width:660px;width:100%;border-collapse:collapse}
.mvx-deck .matrix th,.mvx-deck .matrix td{text-align:left;padding:0;vertical-align:middle}
.mvx-deck .matrix thead th{padding:16px 14px 13px;border-bottom:1px solid var(--line)}
.mvx-deck .matrix thead .mk{font-family:var(--bdy);font-weight:600;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-2);display:block}
.mvx-deck .matrix thead .mf{font-family:var(--dsp);font-weight:700;font-size:15px;letter-spacing:-.02em;color:var(--ink);display:block;margin-top:3px}
.mvx-deck .svc{font-family:var(--dsp);font-weight:600;font-size:13.5px;color:var(--ink);letter-spacing:-.01em;padding:0 14px;white-space:nowrap}
.mvx-deck .svc .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--spark);margin-right:10px;vertical-align:1px}
.mvx-deck .matrix tbody tr{border-bottom:1px solid var(--line-soft)}
.mvx-deck .cell{padding:7px 10px}
.mvx-deck .lvl{border-radius:8px;padding:10px 12px;min-height:52px;display:flex;flex-direction:column;justify-content:center;gap:2px}
.mvx-deck .lvl .l{font-family:var(--bdy);font-weight:600;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.9}
.mvx-deck .lvl .v{font-family:var(--dsp);font-weight:700;font-size:15px;letter-spacing:-.01em}
.mvx-deck .h0{background:var(--h0);color:var(--muted-2)}.mvx-deck .h1{background:var(--h1);color:var(--on-h-lo)}
.mvx-deck .h2{background:var(--h2);color:var(--on-h-lo)}.mvx-deck .h3{background:var(--h3);color:var(--on-h-mid)}
.mvx-deck .h4{background:var(--h4);color:var(--on-h-hi)}
.mvx-deck .matrix tfoot td{padding:15px 14px;border-top:2px solid var(--ink)}
.mvx-deck .matrix tfoot .svc{font-weight:800}
.mvx-deck .tot{font-family:var(--dsp);font-weight:800;font-size:19px;color:var(--ink);letter-spacing:-.02em}
.mvx-deck .tot small{display:block;font-family:var(--bdy);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-2);font-weight:600;margin-top:2px}
.mvx-deck .legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:15px;align-items:center}
.mvx-deck .legend .k{display:inline-flex;align-items:center;gap:7px;font-family:var(--bdy);font-weight:600;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.mvx-deck .legend .sw{width:16px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.05)}
.mvx-deck .phases{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.mvx-deck .phase{border:1px solid var(--line);border-radius:16px;padding:22px;background:var(--paper);display:flex;flex-direction:column;gap:13px}
.mvx-deck .phase .pk{font-family:var(--bdy);font-weight:600;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted-2)}
.mvx-deck .phase h3{font-family:var(--dsp);font-weight:800;font-size:21px;letter-spacing:-.03em}
.mvx-deck .phase .obj{font-size:13px;color:var(--muted);line-height:1.5}
.mvx-deck .mix{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.mvx-deck .mixrow{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;font-size:12.5px;color:var(--body)}
.mvx-deck .bars{display:flex;gap:3px}
.mvx-deck .bars i{width:15px;height:8px;border-radius:2px;background:var(--h0);display:block}
.mvx-deck .bars i.on{background:var(--spark)}
.mvx-deck .phase .price{margin-top:auto;padding-top:13px;border-top:1px solid var(--line-soft)}
.mvx-deck .phase .price .amt{font-family:var(--dsp);font-weight:800;font-size:24px;color:var(--ink);letter-spacing:-.03em}
.mvx-deck .phase .price .amt span{font-size:13px;color:var(--muted);font-weight:600}
.mvx-deck .total{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:22px;background:var(--dark);color:var(--on-dark);border-radius:20px;padding:clamp(24px,4vw,38px);position:relative;overflow:hidden}
.mvx-deck .total::after{content:"";position:absolute;left:-120px;bottom:-140px;width:360px;height:360px;background:radial-gradient(circle,rgba(255,90,0,.16),transparent 66%);pointer-events:none}
.mvx-deck .total .eyebrow{color:var(--spark)}
.mvx-deck .total .big{font-family:var(--dsp);font-weight:800;font-size:clamp(34px,6vw,56px);line-height:1;letter-spacing:-.035em;margin-top:8px;color:var(--on-dark);position:relative;z-index:1}
.mvx-deck .total .big span{color:var(--spark)}
.mvx-deck .total .rt{font-size:12.5px;max-width:33ch;color:var(--on-dark-dim);line-height:1.55;position:relative;z-index:1}
.mvx-deck .close h2{font-family:var(--dsp);font-weight:800;font-size:clamp(30px,5.2vw,50px);line-height:1;letter-spacing:-.035em;max-width:16ch}
.mvx-deck .close h2 span{color:var(--spark)}
.mvx-deck .contact{display:flex;flex-wrap:wrap;gap:28px 52px;margin-top:28px}
.mvx-deck .contact .mono{font-size:13px;line-height:1.7;color:var(--body)}
.mvx-deck footer{padding-block:26px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;font-family:var(--bdy);font-weight:600;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-2)}
@media (max-width:820px){.mvx-deck .caps{grid-template-columns:repeat(2,1fr)}.mvx-deck .meta{grid-template-columns:1fr}}
@media (max-width:520px){.mvx-deck .assets{grid-template-columns:repeat(2,1fr)}.mvx-deck .caps{grid-template-columns:1fr}}
`
