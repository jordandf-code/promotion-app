// components/AICostModal.jsx
// Single reusable confirm modal for AI cost estimates. Mounted once in the app
// shell (Layout). Registers a listener with aiClient so every callAI() shows this
// modal before issuing the real request. Backdrop clicks do NOT close it (gotcha).
//
// Requests are queued: concurrent callAI() invocations (e.g. "Generate all" firing
// several at once) each enqueue and are confirmed one at a time. "Don't ask again
// this session" approves the whole current queue and suppresses future prompts.

import { useEffect, useState } from 'react';
import { registerAIConfirm } from '../utils/aiClient.js';

function fmtUsd(n) {
  if (n == null) return '$0.00';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function fmtTokens(n) {
  return (n ?? 0).toLocaleString();
}

export default function AICostModal() {
  const [queue, setQueue] = useState([]);   // pending { estimate, resolve } requests
  const [dontAsk, setDontAsk] = useState(false);

  useEffect(() => {
    return registerAIConfirm(req => setQueue(q => [...q, req]));
  }, []);

  const pending = queue[0] ?? null;
  if (!pending) return null;

  function finish(proceed) {
    const approveAll = proceed && dontAsk;
    setDontAsk(false);
    if (approveAll) {
      // Approve every request currently queued and suppress future prompts.
      queue.forEach(req => req.resolve({ proceed: true, dontAsk: true }));
      setQueue([]);
    } else {
      const [head, ...rest] = queue;
      head?.resolve({ proceed, dontAsk: false });
      setQueue(rest);
    }
  }

  const est = pending.estimate;
  const hasCost = est && !est.generic;
  const totalTokens = est ? (est.estimatedInputTokens ?? 0) + (est.estimatedOutputTokens ?? 0) : 0;

  return (
    <div className="modal-backdrop modal-backdrop--centered">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Run AI operation?</h3>
          <button className="modal-close" onClick={() => finish(false)}>&times;</button>
        </div>

        <div className="modal-form">
          {hasCost ? (
            <>
              <p>
                This will use about <strong>{fmtTokens(totalTokens)} tokens</strong> and
                cost about <strong>{fmtUsd(est.estimatedCostUsd)}</strong>.
              </p>
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {fmtTokens(est.estimatedInputTokens)} input · up to {fmtTokens(est.estimatedOutputTokens)} output tokens.
                Estimate only — actual usage may differ.
              </p>
            </>
          ) : (
            <p>This will run an AI operation and may incur usage costs on your Anthropic key. Proceed?</p>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              checked={dontAsk}
              onChange={e => setDontAsk(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>Don't ask again this session</span>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => finish(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => finish(true)}>Proceed</button>
          </div>
        </div>
      </div>
    </div>
  );
}
