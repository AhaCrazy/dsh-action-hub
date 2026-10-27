    // ---------------------------------------------------------------- helpers

    /** @param {object} props @returns {(key: string, params?: object) => string} */
    function translate(props) {
      const t = typeof props?.t === 'function' ? props.t : null;
      if (t) return (key, params) => {
        const value = t(key, params);
        return typeof value === 'string' && value !== '' ? value : (TEXT.zh[key] ?? key);
      };
      return (key, params) => {
        let value = TEXT.zh[key] ?? key;
        if (params) for (const [name, replacement] of Object.entries(params)) value = value.split(`{${name}}`).join(String(replacement));
        return value;
      };
    }

    async function api(route, body) {
      const options = body === undefined
        ? { method: 'GET', credentials: 'same-origin' }
        : {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        };
      const response = await fetch(`${API}${route}`, options);
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || payload === null || payload.ok === false) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }
      return payload;
    }

    function describeError(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function expandPrompt(prompt, context = {}) {
      const source = typeof prompt === 'string' ? prompt : '';
      const args = typeof context.args === 'string' ? context.args.trim() : '';
      const now = context.date instanceof Date ? context.date : new Date();
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const hasSlot = ARG_TOKENS.some((token) => source.includes(token));
      let expanded = source;
      for (const token of ARG_TOKENS) expanded = expanded.split(token).join(args);
      expanded = expanded.split('{{date}}').join(date).split('{{DATE}}').join(date);
      if (args !== '' && !hasSlot) expanded = `${expanded}\n\n${args}`;
      return expanded.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trimEnd();
    }

    function composeDraft(draft, text) {
      const current = typeof draft === 'string' ? draft.replace(/\s+$/, '') : '';
      const next = typeof text === 'string' ? text : '';
      if (current === '') return next;
      if (next === '') return current;
      return `${current}\n\n${next}`;
    }

    function referenceEntry(entry) {
      const next = {
        source: entry.source,
        ref: entry.ref,
        offset: entry.offset,
        length: entry.length,
        label: entry.label,
        clipboardText: entry.clipboardText,
      };
      if (entry.appearance !== undefined) next.appearance = entry.appearance;
      if (entry.invalid === true) next.invalid = true;
      return next;
    }

    /**
     * Build the semantic draft for an Action reference. The composer stores the
     * opaque `/ah-…` marker as `clipboardText` but renders `label`, so the input
     * box shows the Action name while the message still carries the marker.
     *
     * Plain drafts insert at the caret; drafts that already contain chips are
     * appended at the end, because their offsets live in clipboard coordinates
     * while the caret is reported in detect coordinates.
     *
     * @param {{ draft: string, span?: object, occurrences?: object[], marker: string, label: string }} input
     * @returns {{ text: string, references: object[] } | null}
     */
    function composeReferenceDraft({ draft, span, occurrences, marker, label }) {
      if (typeof draft !== 'string' || typeof marker !== 'string' || marker === '') return null;
      const existing = Array.isArray(occurrences)
        ? occurrences.filter((entry) => entry !== null && typeof entry === 'object'
          && Number.isInteger(entry.offset) && Number.isInteger(entry.length)
          && typeof entry.clipboardText === 'string')
          .sort((left, right) => left.offset - right.offset)
        : [];
      // Detect-coordinate spans count one placeholder per chip, while clipboard
      // offsets count the chip's full marker (`/ah-…`). Translate the caret.
      const detectToClipboard = (position) => {
        let delta = 0;
        for (const occurrence of existing) {
          const start = occurrence.offset - delta;
          const end = start + 1;
          if (position >= end) {
            delta += Math.max(0, occurrence.length - 1);
            continue;
          }
          if (position > start) return occurrence.offset;
          break;
        }
        return position + delta;
      };
      const detectEnd = draft.length - existing.reduce((sum, entry) => sum + Math.max(0, entry.length - 1), 0);
      const rawStart = span !== null && typeof span === 'object' && Number.isInteger(span.start) ? span.start : detectEnd;
      const rawStop = span !== null && typeof span === 'object' && Number.isInteger(span.end) ? span.end : rawStart;
      const detectStart = Math.min(Math.max(rawStart, 0), detectEnd);
      const detectStop = Math.min(Math.max(rawStop, detectStart), detectEnd);
      const start = detectToClipboard(detectStart);
      const end = detectToClipboard(detectStop);
      if (start < 0 || end < start || start > draft.length || end > draft.length) return null;

      let insert = marker;
      let insertAt = start;
      if (start > 0 && !/\s/u.test(draft.slice(start - 1, start))) {
        insert = ` ${insert}`;
        insertAt += 1;
      }
      const tail = draft.slice(end);
      if (tail === '' || !/^\s/u.test(tail)) insert += ' ';

      const shift = insert.length - (end - start);
      const references = [];
      for (const occurrence of existing) {
        if (occurrence.offset + occurrence.length <= start) {
          references.push(referenceEntry(occurrence));
        } else if (occurrence.offset >= end) {
          references.push({ ...referenceEntry(occurrence), offset: occurrence.offset + shift });
        }
        // A selection covering a chip drops it; normal caret insertion never
        // hits this branch.
      }
      references.push({
        source: 'action',
        ref: marker,
        offset: insertAt,
        length: marker.length,
        label: typeof label === 'string' && label !== '' ? label : marker,
        clipboardText: marker,
      });
      return {
        text: `${draft.slice(0, start)}${insert}${tail}`,
        references,
      };
    }

    function relativeTime(timestamp) {
      if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
      const delta = Date.now() - timestamp;
      if (delta < 60_000) return '刚刚';
      if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
      if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
      if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatBytes(value) {
      const bytes = Number.isFinite(value) && value > 0 ? value : 0;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function bytesToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let index = 0; index < bytes.length; index += chunk) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
      }
      return btoa(binary);
    }

    async function downloadZip(selection = undefined) {
      const ids = selection === undefined
        ? null
        : typeof selection === 'string' ? [selection] : [...selection];
      const suffix = ids === null ? '' : `?ids=${encodeURIComponent(ids.join(','))}`;
      const response = await fetch(`/api/dsh-action-hub/bundle/zip${suffix}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error((await response.text()).slice(0, 300));
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename\*=UTF-8''([^;]+)/iu.exec(disposition);
      const filename = match === null ? 'dsh-action-hub.zip' : decodeURIComponent(match[1]);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        /* fall through to the legacy path */
      }
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } finally {
        document.body.removeChild(area);
      }
      if (!ok) throw new Error('copy failed');
    }

    /* Search scoring: every token must match somewhere, and a name hit weighs far
       more than a body hit, so typing "code" lands on "Code review" first. */
    function compileSearch(query, regex = false) {
      const needle = typeof query === 'string' ? query.trim() : '';
      if (needle === '') return () => true;
      if (regex !== true) {
        const lower = needle.toLowerCase();
        return (text) => String(text ?? '').toLowerCase().includes(lower);
      }
      try {
        const pattern = new RegExp(needle, 'i');
        return (text) => pattern.test(String(text ?? ''));
      } catch {
        return () => false;
      }
    }

    function regexSearchScore(action, matches) {
      if (matches(action.name || '')) return 100;
      if (matches(action.description || '')) return 30;
      if (matches(action.prompt || '')) return 12;
      return -1;
    }

    function searchScore(action, query) {
      const needle = typeof query === 'string' ? query.trim().toLowerCase() : '';
      if (needle === '') return 0;
      const tokens = needle.split(/\s+/);
      const name = (action.name || '').toLowerCase();
      const description = (action.description || '').toLowerCase();
      const prompt = (action.prompt || '').toLowerCase();
      let total = 0;
      for (const token of tokens) {
        let best = -1;
        if (name === token) best = 120;
        else if (name.startsWith(token)) best = 100;
        else if (name.includes(token)) best = 80;
        else if (description.includes(token)) best = 30;
        else if (prompt.includes(token)) best = 12;
        if (best < 0) return -1;
        total += best;
      }
      return total;
    }

    function usagePeriodKeys(now = new Date()) {
      const pad = (value) => String(value).padStart(2, '0');
      const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const offset = (now.getDay() + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const week = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      return { week, month };
    }

    function usageMetric(action, mode, keys) {
      const usage = action.usage ?? {};
      if (mode === 'week') return usage.week?.key === keys.week && Number.isFinite(usage.week?.count) ? usage.week.count : 0;
      if (mode === 'month') return usage.month?.key === keys.month && Number.isFinite(usage.month?.count) ? usage.month.count : 0;
      if (mode === 'total') return Number.isFinite(usage.count) ? usage.count : 0;
      return 0;
    }

    function sortActions(actions, sortBy = 'recent') {
      const keys = usagePeriodKeys();
      const usageMode = sortBy === 'week' || sortBy === 'month' || sortBy === 'total';
      return [...actions].sort((left, right) => {
        if ((left.pinned === true) !== (right.pinned === true)) return left.pinned === true ? -1 : 1;
        const builtin = (left.builtin === true ? 1 : 0) - (right.builtin === true ? 1 : 0);
        if (builtin !== 0) return builtin;
        if (sortBy === 'name') return (left.name || '').localeCompare(right.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.createdAt ?? 0) - (left.createdAt ?? 0);
        if (usageMode) {
          const used = usageMetric(right, sortBy, keys) - usageMetric(left, sortBy, keys);
          if (used !== 0) return used;
        }
        const recent = (right.usage?.lastAt ?? 0) - (left.usage?.lastAt ?? 0);
        if (recent !== 0) return recent;
        return (left.name || '').localeCompare(right.name || '', 'zh-CN');
      });
    }

    function visibleActions(actions, { query = '', sortBy = 'recent', regex = false } = {}) {
      const regexMatcher = regex === true ? compileSearch(query, true) : null;
      const scored = [];
      for (const action of actions) {
        const score = regexMatcher === null ? searchScore(action, query) : regexSearchScore(action, regexMatcher);
        if (score < 0) continue;
        scored.push({ action, score });
      }
      const keys = usagePeriodKeys();
      const usageMode = sortBy === 'week' || sortBy === 'month' || sortBy === 'total';
      scored.sort((left, right) => {
        const pinned = (right.action.pinned === true ? 1 : 0) - (left.action.pinned === true ? 1 : 0);
        if (pinned !== 0) return pinned;
        const builtin = (left.action.builtin === true ? 1 : 0) - (right.action.builtin === true ? 1 : 0);
        if (builtin !== 0) return builtin;
        if (left.score !== right.score) return right.score - left.score;
        if (sortBy === 'name') return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.action.createdAt ?? 0) - (left.action.createdAt ?? 0);
        if (usageMode) {
          const used = usageMetric(right.action, sortBy, keys) - usageMetric(left.action, sortBy, keys);
          if (used !== 0) return used;
        }
        const recent = (right.action.usage?.lastAt ?? 0) - (left.action.usage?.lastAt ?? 0);
        if (recent !== 0) return recent;
        return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
      });
      return scored.map((entry) => entry.action);
    }
