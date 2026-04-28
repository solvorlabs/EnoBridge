import AnimatedContent from './components/AnimatedContent';
import Threads from './components/Threads';

const transferJourney = [
  {
    title: 'Gasless Intent Signed',
    description:
      'Users sign a typed bridge intent while the Gasless Forwarder sponsors execution, reducing onboarding friction.',
    tag: '01',
  },
  {
    title: 'Event and Proof Collection',
    description:
      'Lock events are collected, hashed, and tracked with AI-assisted chain monitoring to flag anomalies early.',
    tag: '02',
  },
  {
    title: 'Relayer Validation Layer',
    description:
      'Centralized or decentralized relayer networks validate proofs and coordinate execution on the destination chain.',
    tag: '03',
  },
  {
    title: 'Mint or Unlock Settlement',
    description:
      'Wrapped assets mint on target chain or native assets unlock in reverse flow with full audit trails.',
    tag: '04',
  },
];

const productModules = [
  {
    name: 'Gasless Forwarder',
    title: 'Meta-transactions for low-friction starts',
    description:
      'Signed requests are replay-safe and nonce-protected, while sponsor wallets pay gas for first-mile interactions.',
    bullets: ['EIP-712 signed payloads', 'Forwarder nonce replay protection', 'Sponsor policy controls'],
  },
  {
    name: 'AI Chain Monitoring',
    title: 'Live risk scoring across chains',
    description:
      'Continuous telemetry watches block finality, relayer behavior, and unusual transfer signatures in near real time.',
    bullets: ['Pattern anomaly alerts', 'Transfer confidence scores', 'Cross-chain activity timeline'],
  },
  {
    name: 'Centralized Relayer',
    title: 'Fast execution path with managed ops',
    description:
      'A managed relayer orchestrates verification and release to optimize throughput for production bridge routes.',
    bullets: ['Operationally simple', 'Lower coordination overhead', 'Predictable latency'],
  },
  {
    name: 'Decentralized Relayer',
    title: 'Consensus-based release security',
    description:
      'Multi-node signatures and threshold approval provide stronger liveness and integrity guarantees.',
    bullets: ['Threshold signature model', 'Independent relayer quorum', 'Tamper-resistant approval flow'],
  },
];

const App = () => {
  return (
    <main className="page">
      <div className="bg-ambient" />
      <div className="background-grid" />

      <header className="nav shell">
        <div className="brand">
          {/* <span className="brand-mark" aria-hidden>
            E
          </span> */}
          <div>
            <p className="brand-name">EnoBridge</p>
            <p className="brand-sub">Gasless and cross-chain bridge stack</p>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#systems">Systems</a>
          <a href="https://solvor.co.in/contact" target="_blank" rel="noopener noreferrer">
            Contact Us
          </a>
        </nav>
      </header>

      <section className="hero shell">
        <Threads
              className="hero-threads absolute 0 w-[100%] h-1/4 pointer-events-none"
              color={[0.22, 0.49, 0.96]}
              amplitude={1.35}
              distance={0.22}
              enableMouseInteraction
            />
        <AnimatedContent distance={80} duration={0.85} ease="power3.out" threshold={0.2}>
          <div className="hero-copy-block">
            <p className="status-pill">Amoy, Sepolia, Multi-relayer</p>
            <h1>
              Frictionless <span>gasless onboarding</span> and secure cross-chain transfer orchestration.
            </h1>
            <p className="hero-copy">
              EnoBridge unifies Gasless Forwarder UX, AI-powered chain monitoring, and both centralized and
              decentralized relayer execution models in one bridge operating surface.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="https://solvor.co.in/contact" target="_blank" rel="noopener noreferrer">
                Request a demo
              </a>
              <a className="secondary-button" href="#systems">
                View architecture
              </a>
            </div>

            <div className="hero-kpis">
              <article>
                <p>Gasless completion</p>
                <strong>97.8%</strong>
              </article>
              <article>
                <p>Avg relayer latency</p>
                <strong>3.2s</strong>
              </article>
              <article>
                <p>Monitoring coverage</p>
                <strong>24/7</strong>
              </article>
            </div>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={120} duration={1} delay={0.08} threshold={0.15}>
          <div id="flows" className="hero-stage">

            <article className="stage-card stage-main">
              <div className="panel-top">
                <p>Cross-Chain Transfer Command Center</p>
                <span>Bridge Ready</span>
              </div>

              <div className="flow-row">
                <div className="flow-chip">Sign Intent</div>
                <div className="flow-line" />
                <div className="flow-chip">Verify</div>
                <div className="flow-line" />
                <div className="flow-chip">Settle</div>
              </div>

              <div className="signal-bars" aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>

            <article className="stage-card stage-gasless">
              <p className="card-title">Gasless Forwarder</p>
              <p className="card-amount">Sponsor Wallet Active</p>
              <p className="card-meta">Meta-tx hash: 0x91af...8ce2</p>
              <div className="progress-track">
                <span className="progress-fill" />
              </div>
            </article>

            <article className="stage-card stage-ai">
              <p className="card-title">AI Chain Monitoring</p>
              <ul>
                <li>Finality confidence: high</li>
                <li>Validator drift: normal</li>
                <li>Anomaly risk: low</li>
              </ul>
            </article>

            <article className="stage-card stage-relayer">
              <p className="card-title">Relayer Consensus</p>
              <p className="card-amount">4 / 5 signatures</p>
              <p className="card-meta">Proof root synced to destination</p>
            </article>
          </div>
        </AnimatedContent>
      </section>

      <section id="how-it-works" className="shell content-section">
        <AnimatedContent distance={70} duration={0.85} threshold={0.2}>
          <div className="section-heading">
            <p>How it works</p>
            <h2>A complete asset transfer lifecycle with observability and trust layers</h2>
          </div>
        </AnimatedContent>

        <div className="steps-grid steps-grid-4">
          {transferJourney.map((step, index) => (
            <AnimatedContent
              key={step.title}
              distance={70}
              direction="vertical"
              threshold={0.15}
              delay={index * 0.06}
              className="step-wrap"
            >
              <article className="step-card">
                <span className="step-tag">{step.tag}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section id="systems" className="shell content-section">
        <AnimatedContent distance={60} threshold={0.2}>
          <div className="section-heading left-heading">
            <p>Platform systems</p>
            <h2>Modules powering gasless, monitored, and multi-relayer bridge execution</h2>
          </div>
        </AnimatedContent>

        <div className="systems-grid">
          {productModules.map((module, index) => (
            <AnimatedContent
              key={module.name}
              distance={80}
              direction="vertical"
              threshold={0.12}
              delay={index * 0.07}
              className="system-wrap"
            >
              <article className="info-card system-card">
                <p className="small-title">{module.name}</p>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <ul className="feature-list">
                  {module.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section className="shell content-section split-flow">
        <AnimatedContent distance={70} threshold={0.2} className="flow-card-wrap">
          <article className="flow-card">
            <div className="flow-card-head">
              <h3>Centralized Relayer Pipeline</h3>
              <span>Managed path</span>
            </div>
            <div className="route-track route-track-central" aria-hidden>
              <span className="route-node">Amoy</span>
              <span className="route-node">Managed Relayer</span>
              <span className="route-node">Sepolia</span>
              <span className="route-orb route-orb-central" />
            </div>
            <p>
              Ideal when operational simplicity and rapid coordination are priorities, with tight control over relay
              infrastructure.
            </p>
          </article>
        </AnimatedContent>

        <AnimatedContent distance={70} threshold={0.2} delay={0.08} className="flow-card-wrap">
          <article className="flow-card">
            <div className="flow-card-head">
              <h3>Decentralized Relayer Pipeline</h3>
              <span>Consensus path</span>
            </div>
            <div className="route-track route-track-decentral" aria-hidden>
              <span className="route-node">Amoy</span>
              <span className="route-node">Relayer A</span>
              <span className="route-node">Relayer B</span>
              <span className="route-node">Relayer C</span>
              <span className="route-node">Sepolia</span>
              <span className="route-orb route-orb-decentral" />
            </div>
            <p>
              Built for stronger trust minimization and resilience through threshold signatures from independent
              relayers.
            </p>
          </article>
        </AnimatedContent>
      </section>

      <footer className="shell footer">
        <p>EnoBridge · Gasless Forwarder · AI Monitoring · Centralized + Decentralized Relayers</p>
      </footer>
    </main>
  );
};

export default App;
