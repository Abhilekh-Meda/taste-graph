export function startJudge({ person, items, label, judgingContext }, onEvent) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person, items, label, judgingContext }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        onEvent({ type: 'error', data: { message: err.error || 'Server error' } });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            onEvent(event);
          } catch { /* skip malformed lines */ }
        }
      }

      if (buffer.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(buffer.slice(6)));
        } catch { /* skip */ }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', data: { message: err.message } });
      }
    }
  })();

  return { abort: () => controller.abort() };
}
