import { UltraWalletSDK } from '@ultraos/wallet-sdk';
import './style.css';

const CONTRACT = import.meta.env.VITE_CONTRACT_ACCOUNT || 'hashedlaunch';
const ULTRA_MAINNET_CHAIN_ID = 'a9c481dfbc7d9506dc7e87e9a137c931b0a9303f64fd7a1d08b8230133920097';
const ULTRA_TESTNET_CHAIN_ID = '7fc56be645bb76ab9d747b53089f132dcb7681db06f0852cfa03eaf6f7ac80e9';

const wallet = new UltraWalletSDK({ environment: 'testnet', provider: 'extension' });
const MAX_ASSET_AMOUNT = (1n << 62n) - 1n;
let account: string | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <nav>
      <div class="brand"><span class="mark">H</span> HASHTL</div>
      <button id="connect" class="wallet">Connect Ultra Wallet</button>
    </nav>

    <section class="hero">
      <div class="eyebrow">ULTRA TESTNET · TOKEN LAUNCHER</div>
      <h1>Create a native<br/>Ultra token.</h1>
      <p>HashTL does one thing: create fungible tokens on Ultra. You remain the issuer.</p>
    </section>

    <section class="card">
      <div class="form-head">
        <div><span class="step">01</span><h2>Token configuration</h2></div>
        <span class="network">TESTNET</span>
      </div>

      <form id="launch-form">
        <div class="grid2">
          <label>Token name<input id="name" maxlength="64" placeholder="My Ultra Token" required /></label>
          <label>Symbol<input id="symbol" maxlength="7" placeholder="MUT" pattern="[A-Z]{1,7}" required /></label>
        </div>
        <div class="grid2">
          <label>Maximum supply<input id="max" inputmode="decimal" value="1000000" required /></label>
          <label>Initial supply<input id="initial" inputmode="decimal" value="1000000" required /></label>
        </div>
        <div class="grid2">
          <label>Decimals<select id="decimals"><option>4</option><option>6</option><option selected>8</option></select></label>
          <label>Metadata URI <span>(optional)</span><input id="uri" maxlength="256" placeholder="ipfs://... or https://..." /></label>
        </div>
        <div class="summary">
          <div><span>Issuer</span><strong id="issuer">Not connected</strong></div>
          <div><span>Contract</span><strong>${CONTRACT}</strong></div>
          <div><span>Network</span><strong>Ultra Testnet</strong></div>
        </div>
        <button id="launch" class="launch" type="submit" disabled>Connect wallet to create token</button>
      </form>
      <div id="status" class="status"></div>
    </section>

    <footer>HashTL · Native Ultra Token Launcher</footer>
  </main>
`;

const connectButton = document.querySelector<HTMLButtonElement>('#connect')!;
const launchButton = document.querySelector<HTMLButtonElement>('#launch')!;
const issuer = document.querySelector<HTMLElement>('#issuer')!;
const status = document.querySelector<HTMLElement>('#status')!;

function showStatus(message: string, kind: 'ok' | 'error' | 'info' = 'info') {
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

connectButton.addEventListener('click', async () => {
  if (!('ultra' in window)) {
    showStatus(
      'Ultra Wallet Extension was not detected. Testnet connections require the Ultra browser extension.',
      'error',
    );
    return;
  }

  connectButton.disabled = true;

  try {
    showStatus('Checking Ultra Wallet network…');

    const chain = await wallet.getChainId();

    if (!chain.data) {
      throw new Error(
        'Ultra Wallet could not reach its current network. Open the extension, unlock it, select Testnet, then try again.',
      );
    }

    // switchNetwork() requires the site to already be trusted. Calling it before
    // the first connect causes error 4100, so first-time users switch manually.
    if (chain.data !== ULTRA_TESTNET_CHAIN_ID) {
      if (chain.data === ULTRA_MAINNET_CHAIN_ID) {
        throw new Error(
          'Ultra Wallet is on Mainnet. Open Ultra Wallet → Networks → Testnet, switch to Testnet, then click Connect again.',
        );
      }

      throw new Error(
        'Ultra Wallet is not on Ultra Testnet. Switch the extension to Testnet, then click Connect again.',
      );
    }

    showStatus('Opening Ultra Wallet…');
    const { data } = await wallet.connect();
    account = data.blockchainid;

    if (!account) {
      throw new Error(
        'Wallet connected, but no Ultra Testnet account is available. Import the private key for your Testnet developer account into Ultra Wallet and select its @active account.',
      );
    }

    connectButton.textContent = account;
    issuer.textContent = account;
    launchButton.disabled = false;
    launchButton.textContent = 'Create token';
    showStatus(`Connected to Ultra Testnet as ${account}.`, 'ok');
  } catch (err: unknown) {
    account = undefined;
    launchButton.disabled = true;
    showStatus(errorMessage(err), 'error');
  } finally {
    connectButton.disabled = false;
  }
});

document.querySelector<HTMLFormElement>('#launch-form')!.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!account) {
    showStatus('Connect your Ultra Wallet first.', 'error');
    return;
  }

  try {
    const tokenName = document.querySelector<HTMLInputElement>('#name')!.value.trim();
    const tokenSymbol = document.querySelector<HTMLInputElement>('#symbol')!.value.trim().toUpperCase();
    const decimals = Number(document.querySelector<HTMLSelectElement>('#decimals')!.value);
    const metadataUri = document.querySelector<HTMLInputElement>('#uri')!.value.trim();

    if (!tokenName || new TextEncoder().encode(tokenName).length > 64) {
      throw new Error('Token name must be 1–64 UTF-8 bytes.');
    }

    if (!/^[A-Z]{1,7}$/.test(tokenSymbol)) {
      throw new Error('Symbol must be 1–7 uppercase A–Z characters.');
    }

    const maximum = formatAsset(document.querySelector<HTMLInputElement>('#max')!.value, decimals, tokenSymbol);
    const initial = formatAsset(document.querySelector<HTMLInputElement>('#initial')!.value, decimals, tokenSymbol);

    if (maximum.atomic <= 0n) throw new Error('Maximum supply must be greater than zero.');
    if (initial.atomic > maximum.atomic) throw new Error('Initial supply cannot exceed maximum supply.');

    launchButton.disabled = true;
    launchButton.textContent = 'Confirm in wallet…';

    const { data } = await wallet.signTransaction({
      contract: CONTRACT,
      action: 'launch',
      data: {
        issuer: account,
        maximum_supply: maximum.asset,
        initial_supply: initial.asset,
        token_name: tokenName,
        metadata_uri: metadataUri,
      },
    });

    showStatus(`Token created. Transaction: ${data.transactionHash ?? 'submitted'}`, 'ok');
  } catch (err: unknown) {
    showStatus(errorMessage(err), 'error');
  } finally {
    launchButton.disabled = false;
    launchButton.textContent = 'Create token';
  }
});