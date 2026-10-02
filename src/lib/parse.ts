export interface ExtractResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  position?: { line: number; column: number };
  repaired?: boolean;
  truncated?: boolean;
}

function sliceBalanced(text: string): string | null {
  const start = text.search(/[[{]/);
  if (start === -1) return null;

  const opener = text[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === opener) depth++;
    else if (char === closer) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return text.slice(start);
}

function repair(source: string): { text: string; truncated: boolean } {
  let out = source;

  out = out.replace(/[\u201c\u201d\u201e\u201f]/g, '"').replace(/[\u2018\u2019]/g, "'");

  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:"'\\])\/\/[^\n\r]*/g, '$1');

  // Chave com aspas simples precisa casar antes da regra de chave sem aspas,
  // senão '"name"' vira o valor de uma chave fantasma.
  out = out.replace(/([{,]\s*)'([^'\n\r]*)'(\s*:)/g, '$1"$2"$3');
  out = out.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');

  out = out.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner: string) => {
    return `: "${inner.replace(/"/g, '\\"')}"`;
  });

  out = out.replace(/,(\s*[}\]])/g, '$1');

  const closed = closeDangling(out);
  return { text: closed.text.trim(), truncated: closed.truncated };
}

function closeDangling(source: string): { text: string; truncated: boolean } {
  const stack: { char: string; index: number }[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{' || char === '[') stack.push({ char, index: i });
    else if (char === '}' || char === ']') stack.pop();
  }

  let out = source;
  let truncated = false;

  if (inString) {
    // Resposta cortada no meio de uma string: o último objeto está pela
    // metade. Descartamos esse objeto em vez de só fechar a string, senão
    // um item com nome truncado entraria na lista sem aviso.
    truncated = true;
    const lastObject = [...stack].reverse().find((entry) => entry.char === '{');

    if (lastObject && stack.length > 1) {
      out = source.slice(0, lastObject.index);
      while (stack.length && (stack.at(-1)?.index ?? -1) >= lastObject.index) stack.pop();
    } else {
      out += '"';
    }
  }

  out = out.replace(/,\s*$/, '');

  while (stack.length) {
    out += stack.pop()?.char === '{' ? '}' : ']';
  }

  return { text: out, truncated };
}

function positionOf(text: string, message: string): { line: number; column: number } | undefined {
  const match = /position (\d+)/i.exec(message);
  if (!match?.[1]) return undefined;
  const offset = Math.min(Number(match[1]), text.length);
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

export function extractJson(input: string): ExtractResult {
  const text = input.trim();
  if (!text) return { ok: false, error: 'Cole o JSON que a IA devolveu.' };

  const sliced = sliceBalanced(text);
  if (!sliced) {
    return {
      ok: false,
      error: 'Não encontrei nenhum JSON nesse texto. Esperava algo começando com { ou [.',
    };
  }

  try {
    return { ok: true, value: JSON.parse(sliced) };
  } catch {}

  const repaired = repair(sliced);
  try {
    return {
      ok: true,
      value: JSON.parse(repaired.text),
      repaired: true,
      truncated: repaired.truncated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: 'O JSON está inválido, mesmo depois de tentar consertar.',
      position: positionOf(sliced, message),
    };
  }
}
