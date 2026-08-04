export function wordTokenize(text) {
  return (text.match(/[A-Za-z0-9']+|[^\sA-Za-z0-9']/g) || []).map((token) => token);
}

export function normalizeWord(token) {
  return token.toLowerCase();
}

export function detokenizeWords(tokens) {
  return tokens.reduce((text, token) => {
    if (/^[.,!?;:]$/.test(token)) return text + token;
    return text ? `${text} ${token}` : token;
  }, '');
}

export class NGramTeachingModel {
  constructor(sentences = [], maxOrder = 6) {
    this.maxOrder = maxOrder;
    this.setCorpus(sentences);
  }

  setCorpus(sentences) {
    this.sentences = [...sentences];
    this.tokenized = this.sentences.map((sentence) => wordTokenize(sentence));
  }

  predict(context, options = {}) {
    const { maxOrder = this.maxOrder, minOrder = 1 } = options;
    const contextTokens = wordTokenize(context);
    const normalizedContext = contextTokens.map(normalizeWord);

    for (let order = Math.min(maxOrder, normalizedContext.length); order >= minOrder; order -= 1) {
      const suffix = normalizedContext.slice(-order);
      const counts = new Map();
      const evidence = [];

      for (let sentenceIndex = 0; sentenceIndex < this.tokenized.length; sentenceIndex += 1) {
        const tokens = this.tokenized[sentenceIndex];
        const normalized = tokens.map(normalizeWord);
        for (let i = 0; i <= normalized.length - order - 1; i += 1) {
          const window = normalized.slice(i, i + order);
          if (window.every((token, index) => token === suffix[index])) {
            const nextToken = tokens[i + order];
            const key = normalizeWord(nextToken);
            const entry = counts.get(key) || { token: nextToken, count: 0 };
            entry.count += 1;
            counts.set(key, entry);
            evidence.push({
              sentence: this.sentences[sentenceIndex],
              nextToken,
              matchedText: detokenizeWords(tokens.slice(i, i + order)),
            });
          }
        }
      }

      if (counts.size > 0) {
        const total = [...counts.values()].reduce((sum, item) => sum + item.count, 0);
        const candidates = [...counts.values()]
          .map((item) => ({ ...item, probability: item.count / total }))
          .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token));
        return { order, suffix, candidates, evidence, total };
      }
    }

    return { order: 0, suffix: [], candidates: [], evidence: [], total: 0 };
  }

  generalFrequency() {
    const counts = new Map();
    let total = 0;
    for (const tokens of this.tokenized) {
      for (const token of tokens) {
        if (/^[.,!?;:]$/.test(token)) continue;
        const key = normalizeWord(token);
        const entry = counts.get(key) || { token, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
        total += 1;
      }
    }
    return [...counts.values()]
      .map((item) => ({ ...item, probability: item.count / total }))
      .sort((a, b) => b.count - a.count);
  }
}

export function stableSoftmax(logits, temperature = 1) {
  if (!Number.isFinite(temperature) || temperature <= 0) {
    const maxIndex = logits.indexOf(Math.max(...logits));
    return logits.map((_, index) => (index === maxIndex ? 1 : 0));
  }
  const scaled = logits.map((value) => value / temperature);
  const max = Math.max(...scaled);
  const exponentials = scaled.map((value) => Math.exp(value - max));
  const sum = exponentials.reduce((acc, value) => acc + value, 0);
  return exponentials.map((value) => value / sum);
}

export function cumulativeDistribution(probabilities) {
  let running = 0;
  return probabilities.map((probability) => {
    const start = running;
    running += probability;
    return { probability, start, end: running };
  });
}

export function sampleIndex(probabilities, randomValue = Math.random()) {
  let running = 0;
  for (let i = 0; i < probabilities.length; i += 1) {
    running += probabilities[i];
    if (randomValue <= running || i === probabilities.length - 1) return i;
  }
  return probabilities.length - 1;
}

export function normalizeWeights(rawWeights) {
  const safe = rawWeights.map((value) => Math.max(0, Number(value) || 0));
  const sum = safe.reduce((acc, value) => acc + value, 0);
  if (sum === 0) return safe.map(() => 1 / safe.length);
  return safe.map((value) => value / sum);
}

export function weightedContextVector(cueVectors, rawWeights) {
  const weights = normalizeWeights(rawWeights);
  const dimensions = cueVectors[0]?.length || 0;
  const vector = Array.from({ length: dimensions }, () => 0);
  cueVectors.forEach((cue, cueIndex) => {
    cue.forEach((value, dimension) => {
      vector[dimension] += value * weights[cueIndex];
    });
  });
  return { vector, weights };
}

export function candidateDistributionFromContext(contextVector, candidates, sharpness = 4.5) {
  const logits = candidates.map((candidate) => {
    const dot = candidate.vector.reduce((sum, value, index) => sum + value * contextVector[index], 0);
    return candidate.baseline + sharpness * dot;
  });
  const probabilities = stableSoftmax(logits, 1);
  return candidates.map((candidate, index) => ({
    ...candidate,
    logit: logits[index],
    probability: probabilities[index],
  })).sort((a, b) => b.probability - a.probability);
}

export function formatTokenForDisplay(token) {
  return String(token)
    .replace(/ /g, '␠')
    .replace(/\n/g, '↵')
    .replace(/\t/g, '⇥') || '∅';
}

export function percent(value, digits = 1) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function round(value, digits = 3) {
  return Number(value).toFixed(digits);
}
