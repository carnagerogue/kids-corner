import { AppIcon } from "../components/AppIcon";

type LandingPageProps = {
  onChild: () => void;
  onGrownup: () => void;
};

const BASE_URL = import.meta.env.BASE_URL;

export function LandingPage({ onChild, onGrownup }: LandingPageProps) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="landing-nav__brand" href="#top" aria-label="Luminara home">
          <img src={`${BASE_URL}luminara-icon.png`} alt="" />
          <span>Luminara</span>
        </a>
        <nav className="landing-nav__links" aria-label="Landing page">
          <a href="#how-it-works">How it works</a>
          <a href="#for-families">For families</a>
          <a href="#safety">Safety</a>
        </nav>
        <button className="landing-button landing-button--compact" onClick={onGrownup}>
          Open Luminara
        </button>
      </header>

      <main id="top">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <h1 id="landing-title">A brighter way for families to learn, plan, and grow.</h1>
            <p>
              Luminara brings each child’s day, learning apps, missions, and family
              encouragement into one calm space—while grown-ups stay confidently in the loop.
            </p>
            <div className="landing-actions">
              <button className="landing-button landing-button--primary" onClick={onChild}>
                <AppIcon name="sparkle" />
                Enter kid space
              </button>
              <button className="landing-button landing-button--secondary" onClick={onGrownup}>
                <AppIcon name="lock" />
                Grown-up dashboard
              </button>
            </div>
            <p className="landing-hero__note">Two thoughtful spaces. One connected family.</p>
          </div>

          <div className="landing-hero__visual" aria-label="A preview of a child’s day in Luminara">
            <div className="landing-orbit landing-orbit--one" aria-hidden="true" />
            <div className="landing-orbit landing-orbit--two" aria-hidden="true" />
            <div className="landing-product">
              <div className="landing-product__bar">
                <span className="landing-product__identity">
                  <img src={`${BASE_URL}luminara-icon.png`} alt="" />
                  Today
                </span>
                <span className="landing-product__avatar" aria-hidden="true">C</span>
              </div>
              <div className="landing-product__welcome">
                <span>Good morning, Claire</span>
                <strong>Ready for a bright day?</strong>
              </div>
              <div className="landing-day">
                <div className="landing-day__time">9:30</div>
                <div className="landing-day__line" aria-hidden="true"><span /></div>
                <div className="landing-day__activity">
                  <span className="landing-mini-icon landing-mini-icon--teal"><AppIcon name="apps" /></span>
                  <span><strong>Study time</strong><small>Math and reading</small></span>
                </div>
                <button className="landing-day__start" onClick={onChild}>Start</button>
              </div>
              <div className="landing-progress">
                <div>
                  <span className="landing-mini-icon landing-mini-icon--violet"><AppIcon name="target" /></span>
                  <span><strong>Daily mission</strong><small>2 of 3 steps complete</small></span>
                </div>
                <span className="landing-progress__ring">2/3</span>
              </div>
            </div>

            <div className="landing-parent-note">
              <span className="landing-mini-icon landing-mini-icon--pink"><AppIcon name="heart" /></span>
              <span><strong>Grown-up view</strong><small>Progress is ready to review</small></span>
              <AppIcon name="check" />
            </div>
          </div>
        </section>

        <section className="landing-promise" aria-label="Luminara benefits">
          <p>Less juggling. More momentum.</p>
          <div>
            <span><AppIcon name="calendar" /> A day children can follow</span>
            <span><AppIcon name="shield" /> Boundaries grown-ups control</span>
            <span><AppIcon name="heart" /> Progress the whole family can celebrate</span>
          </div>
        </section>

        <section className="landing-flow" id="how-it-works" aria-labelledby="flow-title">
          <div className="landing-section-copy">
            <h2 id="flow-title">Everything in its natural place.</h2>
            <p>
              Children see what matters now. Grown-ups get the controls and context they need.
              The rest stays quietly out of the way.
            </p>
          </div>
          <ol className="landing-steps">
            <li>
              <span className="landing-steps__number">01</span>
              <div><strong>Set the rhythm</strong><p>Build a clear daily plan with learning, breaks, and family time.</p></div>
            </li>
            <li>
              <span className="landing-steps__number">02</span>
              <div><strong>Let curiosity lead</strong><p>Children move naturally between their day, approved apps, and missions.</p></div>
            </li>
            <li>
              <span className="landing-steps__number">03</span>
              <div><strong>Notice the growth</strong><p>Review progress, celebrate effort, and shape what comes next.</p></div>
            </li>
          </ol>
        </section>

        <section className="landing-spaces" id="for-families" aria-labelledby="spaces-title">
          <div className="landing-section-copy landing-section-copy--center">
            <h2 id="spaces-title">Designed for both sides of the family.</h2>
            <p>Each person gets a space that feels made for what they need to do.</p>
          </div>

          <div className="landing-space landing-space--kids">
            <div className="landing-space__copy">
              <span className="landing-space__icon"><AppIcon name="sparkle" /></span>
              <h3>For children</h3>
              <p>A focused home base that makes the next step obvious—and growing independence feel good.</p>
              <ul>
                <li><AppIcon name="check" /> See today’s plan at a glance</li>
                <li><AppIcon name="check" /> Open approved learning apps</li>
                <li><AppIcon name="check" /> Complete missions and celebrate progress</li>
                <li><AppIcon name="check" /> Stay connected to family</li>
              </ul>
              <button className="landing-text-button" onClick={onChild}>Enter kid space <AppIcon name="arrow-right" /></button>
            </div>
            <div className="landing-space__preview landing-space__preview--kids">
              <div className="landing-kid-nav" aria-hidden="true">
                <span className="is-active"><AppIcon name="home" /> Today</span>
                <span><AppIcon name="calendar" /> Plan</span>
                <span><AppIcon name="apps" /> Apps</span>
                <span><AppIcon name="target" /> Missions</span>
              </div>
              <div className="landing-kid-feature">
                <span>Up next</span>
                <strong>Reading adventure</strong>
                <small>Starts at 10:15</small>
                <div><span style={{ width: "68%" }} /></div>
              </div>
              <div className="landing-kid-cards">
                <div><AppIcon name="trophy" /><span><strong>4 day streak</strong><small>Keep it going</small></span></div>
                <div><AppIcon name="heart" /><span><strong>Family note</strong><small>You’ve got this!</small></span></div>
              </div>
            </div>
          </div>

          <div className="landing-space landing-space--grownups">
            <div className="landing-space__preview landing-space__preview--grownups">
              <div className="landing-grown-side" aria-hidden="true">
                <img src={`${BASE_URL}luminara-icon.png`} alt="" />
                <span className="is-active"><AppIcon name="home" /></span>
                <span><AppIcon name="inbox" /></span>
                <span><AppIcon name="users" /></span>
                <span><AppIcon name="calendar" /></span>
              </div>
              <div className="landing-grown-main">
                <span>Family overview</span>
                <strong>Everyone is moving forward.</strong>
                <div className="landing-grown-list">
                  <div><span className="landing-grown-avatar">C</span><span><strong>Claire</strong><small>Today · 3 of 4 complete</small></span><span className="landing-grown-status">On track</span></div>
                  <div><span className="landing-grown-avatar landing-grown-avatar--two">H</span><span><strong>Hailee</strong><small>Today · 2 of 3 complete</small></span><span className="landing-grown-status">On track</span></div>
                </div>
              </div>
            </div>
            <div className="landing-space__copy">
              <span className="landing-space__icon landing-space__icon--pink"><AppIcon name="lock" /></span>
              <h3>For grown-ups</h3>
              <p>A private command center for planning the week, reviewing progress, and guiding safely.</p>
              <ul>
                <li><AppIcon name="check" /> Plan schedules without the clutter</li>
                <li><AppIcon name="check" /> Approve apps and manage access</li>
                <li><AppIcon name="check" /> Review learning and mission progress</li>
                <li><AppIcon name="check" /> Keep family settings in one place</li>
              </ul>
              <button className="landing-text-button landing-text-button--pink" onClick={onGrownup}>Open grown-up dashboard <AppIcon name="arrow-right" /></button>
            </div>
          </div>
        </section>

        <section className="landing-safety" id="safety" aria-labelledby="safety-title">
          <div className="landing-safety__mark"><AppIcon name="shield" /></div>
          <div>
            <h2 id="safety-title">Their space feels open. The boundaries stay yours.</h2>
            <p>
              Child access is separated from grown-up controls. Family devices can be connected
              intentionally, apps are chosen by grown-ups, and private settings stay behind the
              grown-up sign-in.
            </p>
          </div>
          <div className="landing-safety__points">
            <span><AppIcon name="lock" /><strong>Separate access</strong><small>Child and grown-up spaces stay distinct</small></span>
            <span><AppIcon name="apps" /><strong>Approved apps</strong><small>Children see only what belongs in their space</small></span>
            <span><AppIcon name="shield" /><strong>Family control</strong><small>Grown-ups manage the important settings</small></span>
          </div>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <div className="landing-section-copy">
            <h2 id="faq-title">A few helpful answers.</h2>
          </div>
          <div className="landing-faq__list">
            <details>
              <summary>Is Luminara only for schoolwork?</summary>
              <p>No. Luminara can hold the whole rhythm of a child’s day—from learning and missions to breaks, creativity, and family moments.</p>
            </details>
            <details>
              <summary>Do children and grown-ups see the same thing?</summary>
              <p>No. Children get a simple, encouraging space for their day. Grown-ups get private planning, review, access, and family controls.</p>
            </details>
            <details>
              <summary>Can more than one child use it?</summary>
              <p>Yes. Each child has their own profile, plan, progress, and space inside the family experience.</p>
            </details>
            <details>
              <summary>How do we get started?</summary>
              <p>Open the grown-up dashboard to create or connect your family, then guide each child into their own Luminara space.</p>
            </details>
          </div>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <img src={`${BASE_URL}luminara-icon.png`} alt="" />
          <h2 id="final-title">Make room for brighter days.</h2>
          <p>One thoughtful home for learning, family rhythm, and the little wins along the way.</p>
          <div className="landing-actions landing-actions--center">
            <button className="landing-button landing-button--primary" onClick={onChild}>Enter kid space</button>
            <button className="landing-button landing-button--secondary" onClick={onGrownup}>Grown-up dashboard</button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-nav__brand" href="#top">
          <img src={`${BASE_URL}luminara-icon.png`} alt="" />
          <span>Luminara</span>
        </a>
        <p>Spark curiosity. Build skills. Light tomorrow.</p>
        <a href={`${BASE_URL}privacy.html`}>Privacy</a>
      </footer>
    </div>
  );
}
