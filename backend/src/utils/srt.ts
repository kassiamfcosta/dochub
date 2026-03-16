import { WordTimestamp } from '../services/speech-to-text/SpeechToTextService';

function formatTime(seconds: number): string {
  const ms = Math.floor(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, d = 2) => String(n).padStart(d, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function buildSrtFromWords(words: WordTimestamp[], maxCharsPerCue = 80): string {
  if (!words || words.length === 0) return '';
  const cues: { start: number; end: number; text: string }[] = [];
  let current = { start: words[0].start, end: words[0].end, text: words[0].word };
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    const candidate = current.text + ' ' + w.word;
    if (candidate.length > maxCharsPerCue) {
      cues.push(current);
      current = { start: w.start, end: w.end, text: w.word };
    } else {
      current.text = candidate;
      current.end = w.end;
    }
  }
  cues.push(current);
  return cues
    .map((cue, idx) => `${idx + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}\n`)
    .join('\n');
}

