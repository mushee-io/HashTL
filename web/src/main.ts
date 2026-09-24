import { UltraWalletSDK } from '@ultraos/wallet-sdk';
import './style.css';

const CONTRACT = import.meta.env.VITE_CONTRACT_ACCOUNT || 'hashedlaunch';
const ULTRA_MAINNET_CHAIN_ID = 'a9c481dfbc7d9506dc7e87e9a137c931b0a9303f64fd7a1d08b8230133920097';
const ULTRA_TESTNET_CHAIN_ID = '7fc56be645bb76ab9d747b53089f132dcb7681db06f0852cfa03eaf6f7ac80e9';
const EXPLORER_TX = 'https://explorer.testnet.ultra.io/tx/';

const wallet = new UltraWalletSDK({ environment: 'testnet', provider: 'extension' });
const MAX_ASSET_AMOUNT = (1n << 62n) - 1n;
let account: string | undefined;
let pendingLaunch: LaunchConfig | undefined;

type LaunchConfig = {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  maximum: { atomic: bigint; asset: string };
  initial: { atomic: bigint; asset: string };
  metadataUri: string;
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const path = window.location.pathname.replace(/\/+$/, '') || '/';

const hashMark = `
  <span class="hash-mark" aria-hidden="true">
    <i></i><i></i><i></i><i></i>
  </span>
`;

function nav(active: 'launch' | 'docs' | 'faq' | 'terms' | 'security') {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="Hash home">${hashMark}<span>HASH</span></a>
        <nav class="nav-pill" aria-label="Primary navigation">
          <a class="${active === 'launch' ? 'active' : ''}" href="/">Launch</a>
          <a class="${active === 'docs' ? 'active' : ''}" href="/docs">Docs</a>
          <a class="${active === 'faq' ? 'active' : ''}" href="/faq">FAQ</a>
          <a class="${active === 'terms' ? 'active' : ''}" href="/terms">Terms</a>
        </nav>
        <button id="header-connect" class="button button-light header-connect" type="button">Connect</button>
      </div>
    </header>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="/">${hashMark}<span>HASH</span></a>
          <p>Token infrastructure without the noise.</p>
          <span class="mono">Ultra native token launcher</span>
        </div>
        <div>
          <h3>PRODUCT</h3>
          <a href="/">Launch</a>
        </div>
        <div>
          <h3>LEARN</h3>
          <a href="/docs">Docs</a>
          <a href="/faq">FAQ</a>
          <a href="/security">Security</a>
        </div>
        <div>
          <h3>ELSEWHERE</h3>
          <a href="https://x.com/mushee_io" target="_blank" rel="noreferrer">X</a>
          <a href="https://github.com/mushee-io/HashTL" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Hash.</span>
        <span>Built for onchain creation.</span>
      </div>
    </footer>
  `;
}

function renderLaunch() {
  app.innerHTML = `
    ${nav('launch')}
    <main>
      <section class="hero container">
        <p class="kicker">HASH TOKEN LAUNCHER · ULTRA TESTNET</p>
        <h1>Launch a token</h1>
        <p class="hero-copy">Create your token directly from your wallet.<br class="desktop-only"> Configure the details, review the transaction, and sign once.</p>
      </section>

      <section class="launch-layout container">
        <form id="launch-form" class="launch-card" novalidate>
          <div class="section-block">
            <div class="section-heading">
              <label class="plain-label" for="image">Token image</label>
              <span>PNG, JPG, GIF or WEBP. Square works best.</span>
            </div>
            <label class="dropzone" id="dropzone" for="image">
              <input id="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden />
              <span id="drop-preview" class="drop-preview">No image</span>
              <span class="drop-copy">
                <strong>Drop an image here or click to choose</strong>
                <small>Local preview only. Persist media through your metadata URI.</small>
              </span>
            </label>
          </div>

          <div class="section-block">
            <div class="field-grid">
              <label class="field">
                <span class="field-head"><span>Token name</span><small id="name-count">0 / 32</small></span>
                <input id="name" maxlength="32" autocomplete="off" placeholder="Token name" required />
              </label>
              <label class="field">
                <span class="field-head"><span>Token symbol</span><small id="symbol-count">0 / 7</small></span>
                <span class="prefix-input"><b>$</b><input id="symbol" maxlength="7" autocomplete="off" placeholder="HASH" pattern="[A-Za-z]{1,7}" required /></span>
              </label>
            </div>
            <label class="field">
              <span class="field-head"><span>Description</span><small id="description-count">0 / 600</small></span>
              <textarea id="description" maxlength="600" rows="5" placeholder="Describe your token."></textarea>
            </label>
          </div>

          <details class="optional-block">
            <summary>Add links <span>(optional)</span></summary>
            <div class="optional-content">
              <div class="field-grid">
                <label class="field"><span>Website</span><input id="website" inputmode="url" placeholder="https://..." /></label>
                <label class="field"><span>X / Twitter</span><input id="twitter" inputmode="url" placeholder="https://x.com/..." /></label>
                <label class="field"><span>Telegram</span><input id="telegram" inputmode="url" placeholder="https://t.me/..." /></label>
                <label class="field"><span>Discord</span><input id="discord" inputmode="url" placeholder="https://discord.gg/..." /></label>
              </div>
              <label class="field">
                <span class="field-head"><span>Metadata URI</span><small>on-chain reference · optional</small></span>
                <input id="uri" maxlength="256" placeholder="ipfs://... or https://..." />
              </label>
              <p class="field-note">Hash stores the token name and metadata URI in the launcher contract. Image, description and social links are preview fields unless they are represented by the URI you provide.</p>
            </div>
          </details>

          <div class="section-block">
            <div class="section-heading">
              <span class="plain-label">Supply configuration</span>
              <span>Native Ultra asset parameters.</span>
            </div>
            <div class="field-grid supply-grid">
              <label class="field"><span>Maximum supply</span><input id="max" inputmode="decimal" value="1000000" required /></label>
              <label class="field"><span>Initial supply</span><input id="initial" inputmode="decimal" value="1000000" required /></label>
              <label class="field"><span>Decimals</span><select id="decimals"><option>4</option><option>6</option><option selected>8</option></select></label>
            </div>
            <p class="field-note">Initial supply is issued to your connected Ultra account in the same launch transaction. Hash does not create a market, swap, pool or initial buy.</p>
          </div>

          <div class="launch-info">
            <p>You approve the token creation transaction from your connected Ultra Wallet. Your account is the issuer and RAM payer for token rows created by the launcher.</p>
            <div class="info-row"><span>Network</span><strong class="mono">Ultra Testnet</strong></div>
            <div class="info-row"><span>Launcher contract</span><strong class="mono">${CONTRACT}</strong></div>
          </div>

          <div class="wallet-area">
            <div>
              <span class="wallet-caption">WALLET</span>
              <strong id="wallet-state">Connect your wallet to continue.</strong>
            </div>
            <button id="launch-action" class="button button-light primary-action" type="button">Connect Wallet</button>
          </div>
          <div id="status" class="status" role="status" aria-live="polite"></div>
        </form>

        <aside class="preview-card">
          <p class="preview-title">PREVIEW</p>
          <div class="preview-token">
            <span id="preview-image" class="token-avatar">#</span>
            <div>
              <strong id="preview-name">Token name</strong>
              <span id="preview-symbol" class="mono">$HASH</span>
            </div>
          </div>
          <p id="preview-description" class="preview-description">Description appears here.</p>
          <div class="preview-divider"></div>
          <dl class="preview-rows">
            <div><dt>Network</dt><dd class="mono">Ultra Testnet</dd></div>
            <div><dt>Issuer</dt><dd id="preview-wallet" class="mono">your wallet</dd></div>
            <div><dt>Token contract</dt><dd class="mono">${CONTRACT}</dd></div>
            <div><dt>Maximum supply</dt><dd id="preview-max" class="mono">—</dd></div>
            <div><dt>Initial issuance</dt><dd id="preview-initial" class="mono">—</dd></div>
            <div><dt>Precision</dt><dd id="preview-decimals" class="mono">8</dd></div>
            <div><dt>Authority</dt><dd class="mono">your wallet</dd></div>
          </dl>
          <p class="preview-foot">Ultra native tokens are identified by launcher contract + symbol.</p>
        </aside>
      </section>

      <dialog id="review-modal" class="review-modal">
        <form method="dialog" class="modal-card">
          <button id="modal-close" class="icon-button" value="cancel" aria-label="Close review">×</button>
          <p class="kicker">TRANSACTION REVIEW</p>
          <h2>Review token launch</h2>
          <p class="modal-copy">Confirm the configuration before opening Ultra Wallet.</p>
          <dl class="review-rows">
            <div><dt>Token name</dt><dd id="review-name"></dd></div>
            <div><dt>Symbol</dt><dd id="review-symbol" class="mono"></dd></div>
            <div><dt>Network</dt><dd class="mono">Ultra Testnet</dd></div>
            <div><dt>Wallet</dt><dd id="review-wallet" class="mono"></dd></div>
            <div><dt>Maximum supply</dt><dd id="review-max" class="mono"></dd></div>
            <div><dt>Initial supply</dt><dd id="review-initial" class="mono"></dd></div>
            <div><dt>Launcher contract</dt><dd class="mono">${CONTRACT}</dd></div>
          </dl>
          <div class="sign-note">Your Ultra Wallet will ask you to approve the transaction. Hash never requests your private key.</div>
          <div id="tx-stage" class="tx-stage" hidden><span class="stage-dot"></span><span></span></div>
          <div class="modal-actions">
            <button class="button button-dark" value="cancel">Cancel</button>
            <button id="sign-launch" class="button button-light" type="button">Sign & Launch</button>
          </div>
        </form>
      </dialog>

      <section id="success-panel" class="success-panel container" hidden>
        <span class="success-dot"></span>
        <p class="kicker">TOKEN LAUNCHED</p>
        <div class="success-main">
          <div id="success-avatar" class="success-avatar">#</div>
          <div><h2 id="success-name">Token</h2><p id="success-symbol" class="mono">$TOKEN</p></div>
        </div>
        <div class="success-id">
          <span>Token ID</span>
          <strong id="success-id" class="mono"></strong>
          <small>Ultra native identity: contract + symbol</small>
        </div>
        <div class="success-actions">
          <button id="copy-token-id" class="button button-dark" type="button">Copy Token ID</button>
          <a id="view-transaction" class="button button-light" target="_blank" rel="noreferrer">View Transaction</a>
        </div>
      </section>
    </main>
    ${footer()}
  `;

  wireLaunchPage();
}

function docsSection(id: string, number: string, title: string, body: string) {
  return `<section id="${id}" class="doc-section"><div class="doc-heading"><span class="mono">${number}</span><h2>${title}</h2></div>${body}</section>`;
}

function renderDocs() {
  app.innerHTML = `
    ${nav('docs')}
    <main class="container docs-shell">
      <aside class="docs-index">
        <a href="#overview"><span>01</span>Overview</a>
        <a href="#flow"><span>02</span>Launch flow</a>
        <a href="#wallets"><span>03</span>Wallets</a>
        <a href="#details"><span>04</span>Token details</a>
        <a href="#supply"><span>05</span>Supply & precision</a>
        <a href="#metadata"><span>06</span>Metadata</a>
        <a href="#resources"><span>07</span>Network resources</a>
        <a href="#identity"><span>08</span>Token identity</a>
        <a href="#security"><span>09</span>Security model</a>
        <a href="#network"><span>10</span>Network & contract</a>
        <a href="#limits"><span>11</span>Limits</a>
        <a href="#failures"><span>12</span>When something fails</a>
        <a href="#not-included"><span>13</span>What is not included</a>
        <a href="#interface"><span>14</span>Contract interface</a>
      </aside>
      <article class="docs-content">
        <p class="kicker">HASH / DOCUMENTATION</p>
        <h1>Documentation</h1>
        <p class="docs-lede">Hash is a focused interface for creating native fungible tokens on Ultra. The parts that matter are wallet authorization, token configuration and the on-chain launcher contract.</p>

        ${docsSection('overview','01','Overview',`
          <p>Hash Token Launcher creates fungible tokens through a native Ultra / Antelope smart contract. A creator connects Ultra Wallet, chooses token parameters, reviews them, and signs the <code>launch</code> action.</p>
          <p>Hash is not a market. It does not provide swaps, liquidity, bonding curves, staking, NFTs, portfolio tracking or trading.</p>
        `)}
        ${docsSection('flow','02','The launch flow',`
          <div class="flow-line"><span>Connect Wallet</span><b>→</b><span>Configure</span><b>→</b><span>Review</span><b>→</b><span>Sign</span><b>→</b><span>Confirm</span></div>
          <p>The connected Ultra account signs one launcher transaction. If the transaction executes, the token definition and initial supply are created atomically.</p>
        `)}
        ${docsSection('wallets','03','Wallets',`
          <p>Hash uses the Ultra Wallet browser extension on Ultra Testnet. The site requests transaction approval through the wallet SDK. Private keys are never requested by the web application.</p>
          <div class="doc-callout"><strong>Never paste a private key into Hash.</strong><span>Signing happens inside Ultra Wallet.</span></div>
        `)}
        ${docsSection('details','04','Token details',`
          <p>The on-chain launcher accepts an issuer account, token name, symbol, maximum supply, initial supply and optional metadata URI. The web interface also provides image, description and link fields for launch preview.</p>
          <p>Only data passed to the contract is persisted by the launcher. Preview media and social fields are not automatically uploaded.</p>
        `)}
        ${docsSection('supply','05','Supply and precision',`
          <p>Maximum supply defines the hard issuance ceiling. Initial supply is minted to the issuer during launch and may be zero. The issuer may later issue additional supply, but never beyond maximum supply.</p>
          <p>Hash currently exposes 4, 6 and 8 decimal precision options. Initial and maximum supply must use the same symbol and precision.</p>
        `)}
        ${docsSection('metadata','06','Metadata',`
          <p>The launcher stores a token name and an optional metadata URI of up to 256 characters. A metadata URI can point to content you host elsewhere, including an IPFS or HTTPS resource.</p>
          <p>The issuer can update the stored token name and metadata URI later through the contract's <code>setmeta</code> action.</p>
        `)}
        ${docsSection('resources','07','Network resources',`
          <p>Ultra uses account resources rather than an EVM-style gas model. Token table rows created by Hash use the issuer as RAM payer. Your account therefore needs enough network resources for the action to execute.</p>
        `)}
        ${docsSection('identity','08','Token identity',`
          <p>Ultra native tokens do not receive an ERC-20-style <code>0x...</code> address. A token launched through Hash is identified by the launcher contract plus its symbol.</p>
          <div class="code-panel"><span>contract</span><strong class="mono">${CONTRACT}</strong><span>example token ID</span><strong class="mono">${CONTRACT}:HASH</strong></div>
        `)}
        ${docsSection('security','09','Security model',`
          <p>The issuer authorizes creation and controls future issuance. Hash has no separate administrator mint permission in the launcher contract. New supply can only be issued to the configured issuer and cannot exceed maximum supply.</p>
          <p>Transfers require the sender's authorization. Metadata updates require the issuer's authorization.</p>
        `)}
        ${docsSection('network','10','Network and contract',`
          <dl class="doc-data"><div><dt>Environment</dt><dd class="mono">Ultra Testnet</dd></div><div><dt>Launcher contract</dt><dd class="mono">${CONTRACT}</dd></div><div><dt>Wallet</dt><dd>Ultra Wallet extension</dd></div></dl>
          <p>The public interface is Testnet-only at this stage. A Testnet token has no Mainnet value by implication.</p>
        `)}
        ${docsSection('limits','11','Limits',`
          <p>Symbols are 1–7 uppercase A–Z characters. Token names are limited to 64 UTF-8 bytes by the contract. Metadata URIs are limited to 256 characters. A symbol can only be created once on this launcher contract.</p>
        `)}
        ${docsSection('failures','12','When something fails',`
          <p>A launch can fail if the wallet rejects the request, the account is on the wrong network, the symbol already exists, values are invalid, the account lacks required resources, or the chain/RPC is unavailable.</p>
          <p>A failed or rejected transaction does not create a token. Read the wallet or transaction error before retrying.</p>
        `)}
        ${docsSection('not-included','13','What is not included',`
          <p>Hash does not create liquidity, execute an initial buy, list a token on an exchange, establish a price, promise tradability, provide a wallet, custody assets, or run a secondary market.</p>
        `)}
        ${docsSection('interface','14','Contract interface',`
          <p>The launcher exposes <code>launch</code>, <code>create</code>, <code>issue</code>, <code>retire</code>, <code>transfer</code>, <code>open</code>, <code>close</code> and <code>setmeta</code>. The Hash web interface focuses on <code>launch</code>.</p>
          <a class="text-link" href="https://github.com/mushee-io/HashTL" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
        `)}
      </article>
    </main>
    ${footer()}
  `;
  wireHeaderConnect();
}

function renderFaq() {
  const faqs = [
    ['What is Hash?', 'Hash is a focused token launcher for native fungible tokens on Ultra. Connect Ultra Wallet, enter token parameters, review the configuration and sign the launch transaction.'],
    ['Which network does Hash use?', 'The current public interface is configured for Ultra Testnet.'],
    ['Does Hash custody my assets?', 'No. Hash does not hold your wallet keys or custody your tokens. Authorization happens through Ultra Wallet.'],
    ['Will Hash ever ask for my private key?', 'No. Never paste a private key into the Hash website. Your wallet handles signing.'],
    ['What is my token address?', `Ultra native tokens do not have an ERC-20-style address. The token identity is the launcher contract plus symbol, for example ${CONTRACT}:HASH.`],
    ['Who is the issuer?', 'The Ultra account connected when the token is launched. Initial supply is issued to that account.'],
    ['Can I mint more later?', 'Yes, if the initial supply is below maximum supply. Only the issuer can issue additional supply, and total supply cannot exceed the configured maximum.'],
    ['Can someone launch the same symbol twice?', 'Not on the same Hash launcher contract. Duplicate token symbols are rejected.'],
    ['Are the image and description stored on-chain?', 'Not automatically. Hash stores the token name and optional metadata URI. Image, description and social links shown in the preview must be represented by your metadata resource if you want them persisted elsewhere.'],
    ['Does Hash perform an initial buy?', 'No. Hash is strictly a token launcher. It does not create a market, execute swaps, seed liquidity or perform purchases.'],
    ['What do I pay?', 'Your Ultra account is responsible for the network resources required by the transaction and token table rows. Hash does not request a separate trading or launch-market fee in this interface.'],
    ['Can a token be deleted?', 'An on-chain launch and its transaction history cannot simply be removed from the blockchain by the website.'],
    ['Is Hash a DEX or launchpad market?', 'No. Hash only creates native Ultra tokens. Trading and liquidity products are outside this application.'],
  ];

  app.innerHTML = `
    ${nav('faq')}
    <main class="container simple-page">
      <p class="kicker">HASH / FAQ</p>
      <h1>FAQ</h1>
      <p class="simple-lede">Short answers. The docs have the long ones.</p>
      <div class="faq-list">
        ${faqs.map(([q,a]) => `<section class="faq-row"><h2>${q}</h2><p>${a}</p></section>`).join('')}
      </div>
    </main>
    ${footer()}
  `;
  wireHeaderConnect();
}

function renderTerms() {
  app.innerHTML = `
    ${nav('terms')}
    <main class="container simple-page legal-page">
      <p class="kicker">HASH / TERMS</p>
      <h1>Terms</h1>
      <p class="simple-lede">Terms for the Hash Token Launcher Testnet interface.</p>

      <div class="legal-copy">
        <h2>1. The product</h2>
        <p>Hash is software that helps users prepare and submit token-creation transactions to the Ultra blockchain. It is a token launcher only. Hash does not operate a token exchange, market, brokerage, custody service, investment service or wallet.</p>

        <h2>2. Testnet status</h2>
        <p>The current interface is configured for Ultra Testnet. Testnet assets are intended for development and testing. Availability, state and integrations may change or reset as the underlying test network evolves.</p>

        <h2>3. Your wallet and authorization</h2>
        <p>You remain responsible for your wallet, account permissions and transaction approvals. Hash does not ask for, receive or store your private key. A transaction is only submitted after approval through the connected Ultra Wallet.</p>

        <h2>4. Token configuration</h2>
        <p>You are responsible for the names, symbols, supply values, metadata and other information you submit. Do not use content you do not have the right to use. Token creation is public blockchain activity and may be permanent.</p>

        <h2>5. Network resources and third parties</h2>
        <p>You are responsible for any Ultra account resources required to execute transactions. Hash may depend on third-party software or infrastructure, including Ultra Wallet, RPC providers, browsers and hosting services. Those services operate under their own terms and availability.</p>

        <h2>6. No market or value promise</h2>
        <p>Creating a token does not create liquidity, a market, a price or an entitlement to future value. Hash does not promise that a token will be tradable, listed, supported by third parties or useful for any particular purpose.</p>

        <h2>7. Transaction finality and errors</h2>
        <p>You should review token parameters before signing. Blockchain transactions may not be reversible. Hash cannot guarantee uninterrupted access, transaction inclusion, RPC availability or the continued operation of third-party infrastructure.</p>

        <h2>8. Prohibited use</h2>
        <p>Do not use Hash to violate applicable law, infringe third-party rights, impersonate others, misrepresent affiliation, distribute malicious content or facilitate fraud.</p>

        <h2>9. No warranty</h2>
        <p>The software is provided on an “as is” and “as available” basis for Testnet use. To the extent permitted by applicable law, no warranty is made regarding uninterrupted operation, fitness for a particular purpose or the actions of independent third parties.</p>

        <h2>10. Your decisions</h2>
        <p>You are responsible for deciding whether to create a token and for reviewing every transaction before approval. Nothing in the interface is investment, legal, tax or financial advice.</p>

        <p class="legal-version"><em>Hash Token Launcher — Terms, version 1.0, effective 24 September 2026.</em></p>
      </div>
    </main>
    ${footer()}
  `;
  wireHeaderConnect();
}

function renderSecurity() {
  app.innerHTML = `
    ${nav('security')}
    <main class="container simple-page">
      <p class="kicker">HASH / SECURITY</p>
      <h1>Security</h1>
      <p class="simple-lede">Small surface area. Explicit wallet authorization.</p>
      <div class="security-grid">
        <section><span class="mono">01</span><h2>No private keys</h2><p>The Hash web app never asks users to paste private keys. Ultra Wallet owns the signing flow.</p></section>
        <section><span class="mono">02</span><h2>Issuer authorization</h2><p>Creation, future issuance and metadata updates require authorization from the configured issuer.</p></section>
        <section><span class="mono">03</span><h2>Supply ceiling</h2><p>Additional issuance cannot exceed the maximum supply chosen at token creation.</p></section>
        <section><span class="mono">04</span><h2>Focused scope</h2><p>No swaps, bridges, staking, lending, custody or market logic is bundled into Hash Token Launcher.</p></section>
      </div>
      <div class="security-contract"><span>Testnet launcher contract</span><strong class="mono">${CONTRACT}</strong></div>
    </main>
    ${footer()}
  `;
  wireHeaderConnect();
}

function renderNotFound() {
  app.innerHTML = `
    ${nav('launch')}
    <main class="container not-found"><p class="kicker">404</p><h1>Page not found.</h1><a class="button button-light" href="/">Return to launcher</a></main>
    ${footer()}
  `;
  wireHeaderConnect();
}

function shortAccount(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function showStatus(message: string, kind: 'ok' | 'error' | 'info' = 'info') {
  const status = document.querySelector<HTMLElement>('#status');
  if (!status) return;
  status.className = `status ${kind}`;
  status.textContent = message;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const candidate = err as { message?: string; code?: number };
    return candidate.message ?? 'Wallet request failed.';
  }
  return 'Wallet request failed.';
}

function parseAmount(raw: string, decimals: number): { atomic: bigint; normalized: string } {
  const value = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Enter a valid decimal amount.');

  const [wholeRaw, fractionRaw = ''] = value.split('.');
  if (fractionRaw.length > decimals) throw new Error(`Amount supports at most ${decimals} decimals.`);

  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.padEnd(decimals, '0');
  const atomic = BigInt((`${whole}${fraction}`).replace(/^0+(?=\d)/, '') || '0');
  if (atomic > MAX_ASSET_AMOUNT) throw new Error('Amount is too large.');

  return { atomic, normalized: decimals ? `${whole}.${fraction}` : whole };
}

function formatAsset(raw: string, decimals: number, symbol: string) {
  const parsed = parseAmount(raw, decimals);
  return { atomic: parsed.atomic, asset: `${parsed.normalized} ${symbol}` };
}

function readLaunchConfig(): LaunchConfig {
  const tokenName = document.querySelector<HTMLInputElement>('#name')!.value.trim();
  const tokenSymbol = document.querySelector<HTMLInputElement>('#symbol')!.value.trim().toUpperCase();
  const decimals = Number(document.querySelector<HTMLSelectElement>('#decimals')!.value);
  const metadataUri = document.querySelector<HTMLInputElement>('#uri')!.value.trim();

  if (!tokenName || new TextEncoder().encode(tokenName).length > 64) {
    throw new Error('Token name must be 1–64 UTF-8 bytes.');
  }

  if (!/^[A-Z]{1,7}$/.test(tokenSymbol)) {
    throw new Error('Symbol must be 1–7 letters A–Z.');
  }

  if (metadataUri.length > 256) throw new Error('Metadata URI must be 256 characters or fewer.');

  const maximum = formatAsset(document.querySelector<HTMLInputElement>('#max')!.value, decimals, tokenSymbol);
  const initial = formatAsset(document.querySelector<HTMLInputElement>('#initial')!.value, decimals, tokenSymbol);

  if (maximum.atomic <= 0n) throw new Error('Maximum supply must be greater than zero.');
  if (initial.atomic > maximum.atomic) throw new Error('Initial supply cannot exceed maximum supply.');

  return { tokenName, tokenSymbol, decimals, maximum, initial, metadataUri };
}

async function connectWallet() {
  if (!('ultra' in window)) {
    throw new Error('Ultra Wallet Extension was not detected. Install or enable Ultra Wallet and try again.');
  }

  const chain = await wallet.getChainId();

  if (!chain.data) {
    throw new Error('Ultra Wallet could not reach its current network. Unlock it, select Testnet, then try again.');
  }

  if (chain.data !== ULTRA_TESTNET_CHAIN_ID) {
    if (chain.data === ULTRA_MAINNET_CHAIN_ID) {
      throw new Error('Ultra Wallet is on Mainnet. Switch to Testnet, then connect again.');
    }
    throw new Error('Ultra Wallet is not on Ultra Testnet. Switch the extension to Testnet, then connect again.');
  }

  const { data } = await wallet.connect();
  account = data.blockchainid;

  if (!account) {
    throw new Error('Wallet connected, but no Ultra Testnet account was returned.');
  }

  return account;
}

function setConnectedUI() {
  if (!account) return;
  const header = document.querySelector<HTMLButtonElement>('#header-connect');
  const action = document.querySelector<HTMLButtonElement>('#launch-action');
  const walletState = document.querySelector<HTMLElement>('#wallet-state');
  const previewWallet = document.querySelector<HTMLElement>('#preview-wallet');

  if (header) header.textContent = shortAccount(account);
  if (action) action.textContent = 'Review Launch';
  if (walletState) walletState.textContent = account;
  if (previewWallet) previewWallet.textContent = shortAccount(account);
}

function wireHeaderConnect() {
  const button = document.querySelector<HTMLButtonElement>('#header-connect');
  if (!button) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await connectWallet();
      button.textContent = shortAccount(account!);
    } catch (err) {
      window.alert(errorMessage(err));
    } finally {
      button.disabled = false;
    }
  });
}

function updatePreview() {
  const name = document.querySelector<HTMLInputElement>('#name')!;
  const symbol = document.querySelector<HTMLInputElement>('#symbol')!;
  const description = document.querySelector<HTMLTextAreaElement>('#description')!;
  const max = document.querySelector<HTMLInputElement>('#max')!;
  const initial = document.querySelector<HTMLInputElement>('#initial')!;
  const decimals = document.querySelector<HTMLSelectElement>('#decimals')!;

  document.querySelector<HTMLElement>('#name-count')!.textContent = `${name.value.length} / 32`;
  document.querySelector<HTMLElement>('#symbol-count')!.textContent = `${symbol.value.length} / 7`;
  document.querySelector<HTMLElement>('#description-count')!.textContent = `${description.value.length} / 600`;

  document.querySelector<HTMLElement>('#preview-name')!.textContent = name.value.trim() || 'Token name';
  document.querySelector<HTMLElement>('#preview-symbol')!.textContent = `$${symbol.value.trim().toUpperCase() || 'HASH'}`;
  document.querySelector<HTMLElement>('#preview-description')!.textContent = description.value.trim() || 'Description appears here.';
  document.querySelector<HTMLElement>('#preview-max')!.textContent = max.value.trim() || '—';
  document.querySelector<HTMLElement>('#preview-initial')!.textContent = initial.value.trim() || '—';
  document.querySelector<HTMLElement>('#preview-decimals')!.textContent = decimals.value;
}

function setTxStage(message: string, state: 'waiting' | 'success' | 'error' = 'waiting') {
  const stage = document.querySelector<HTMLElement>('#tx-stage')!;
  stage.hidden = false;
  stage.className = `tx-stage ${state}`;
  stage.querySelector<HTMLElement>('span:last-child')!.textContent = message;
}

function openReview(config: LaunchConfig) {
  if (!account) return;
  pendingLaunch = config;

  document.querySelector<HTMLElement>('#review-name')!.textContent = config.tokenName;
  document.querySelector<HTMLElement>('#review-symbol')!.textContent = config.tokenSymbol;
  document.querySelector<HTMLElement>('#review-wallet')!.textContent = account;
  document.querySelector<HTMLElement>('#review-max')!.textContent = config.maximum.asset;
  document.querySelector<HTMLElement>('#review-initial')!.textContent = config.initial.asset;

  const modal = document.querySelector<HTMLDialogElement>('#review-modal')!;
  const stage = document.querySelector<HTMLElement>('#tx-stage')!;
  stage.hidden = true;
  modal.showModal();
}

function renderSuccess(config: LaunchConfig, transactionHash?: string) {
  const panel = document.querySelector<HTMLElement>('#success-panel')!;
  const tokenId = `${CONTRACT}:${config.tokenSymbol}`;

  document.querySelector<HTMLElement>('#success-name')!.textContent = config.tokenName;
  document.querySelector<HTMLElement>('#success-symbol')!.textContent = `$${config.tokenSymbol}`;
  document.querySelector<HTMLElement>('#success-id')!.textContent = tokenId;

  const preview = document.querySelector<HTMLElement>('#preview-image');
  const avatar = document.querySelector<HTMLElement>('#success-avatar')!;
  if (preview?.style.backgroundImage) {
    avatar.style.backgroundImage = preview.style.backgroundImage;
    avatar.textContent = '';
  } else {
    avatar.textContent = config.tokenSymbol.slice(0, 1);
  }

  const view = document.querySelector<HTMLAnchorElement>('#view-transaction')!;
  if (transactionHash) {
    view.href = `${EXPLORER_TX}${transactionHash}`;
    view.classList.remove('disabled-link');
  } else {
    view.removeAttribute('href');
    view.classList.add('disabled-link');
  }

  document.querySelector<HTMLButtonElement>('#copy-token-id')!.onclick = async () => {
    await navigator.clipboard.writeText(tokenId);
    document.querySelector<HTMLButtonElement>('#copy-token-id')!.textContent = 'Copied';
  };

  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function wireLaunchPage() {
  wireHeaderConnect();

  const headerConnect = document.querySelector<HTMLButtonElement>('#header-connect')!;
  const launchAction = document.querySelector<HTMLButtonElement>('#launch-action')!;
  const dropzone = document.querySelector<HTMLElement>('#dropzone')!;
  const imageInput = document.querySelector<HTMLInputElement>('#image')!;

  const connectFromLaunch = async () => {
    launchAction.disabled = true;
    headerConnect.disabled = true;
    showStatus('Opening Ultra Wallet…');
    try {
      await connectWallet();
      setConnectedUI();
      showStatus(`Connected to Ultra Testnet as ${account}.`, 'ok');
    } catch (err) {
      showStatus(errorMessage(err), 'error');
    } finally {
      launchAction.disabled = false;
      headerConnect.disabled = false;
    }
  };

  headerConnect.onclick = connectFromLaunch;

  launchAction.addEventListener('click', async () => {
    if (!account) {
      await connectFromLaunch();
      return;
    }

    try {
      const config = readLaunchConfig();
      openReview(config);
      showStatus('');
    } catch (err) {
      showStatus(errorMessage(err), 'error');
    }
  });

  ['name', 'symbol', 'description', 'max', 'initial', 'decimals'].forEach((id) => {
    document.querySelector<HTMLElement>(`#${id}`)!.addEventListener('input', updatePreview);
  });

  document.querySelector<HTMLInputElement>('#symbol')!.addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  });

  const loadImage = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      showStatus('Use a PNG, JPG, GIF or WEBP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showStatus('Keep the preview image under 5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const small = document.querySelector<HTMLElement>('#drop-preview')!;
      const preview = document.querySelector<HTMLElement>('#preview-image')!;
      small.textContent = '';
      preview.textContent = '';
      small.style.backgroundImage = `url("${url}")`;
      preview.style.backgroundImage = `url("${url}")`;
      dropzone.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  };

  imageInput.addEventListener('change', () => loadImage(imageInput.files?.[0]));
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
  }));
  dropzone.addEventListener('drop', (event) => {
    const dragEvent = event as DragEvent;
    loadImage(dragEvent.dataTransfer?.files?.[0]);
  });

  document.querySelector<HTMLButtonElement>('#sign-launch')!.addEventListener('click', async () => {
    if (!account || !pendingLaunch) return;

    const signButton = document.querySelector<HTMLButtonElement>('#sign-launch')!;
    const cancelButton = document.querySelector<HTMLButtonElement>('.modal-actions .button-dark')!;
    signButton.disabled = true;
    cancelButton.disabled = true;
    setTxStage('Waiting for wallet signature…');

    try {
      const config = pendingLaunch;
      const { data } = await wallet.signTransaction({
        contract: CONTRACT,
        action: 'launch',
        data: {
          issuer: account,
          maximum_supply: config.maximum.asset,
          initial_supply: config.initial.asset,
          token_name: config.tokenName,
          metadata_uri: config.metadataUri,
        },
      });

      setTxStage('Token confirmed on Ultra Testnet.', 'success');
      showStatus(`Token launched. Transaction: ${data.transactionHash ?? 'submitted'}`, 'ok');
      setTimeout(() => {
        document.querySelector<HTMLDialogElement>('#review-modal')!.close();
        renderSuccess(config, data.transactionHash);
      }, 650);
    } catch (err) {
      const message = errorMessage(err);
      const rejected = /reject|declin|cancel/i.test(message);
      setTxStage(rejected ? 'Transaction rejected in wallet.' : `Transaction failed: ${message}`, 'error');
      showStatus(rejected ? 'Transaction rejected.' : message, 'error');
    } finally {
      signButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  updatePreview();
}

if (path === '/') renderLaunch();
else if (path === '/docs') renderDocs();
else if (path === '/faq') renderFaq();
else if (path === '/terms') renderTerms();
else if (path === '/security') renderSecurity();
else renderNotFound();
