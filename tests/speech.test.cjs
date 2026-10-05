const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/mobile/app.js', 'utf8').replace(/\r\n/g, '\n');
const block = source.slice(source.indexOf('  const TTS_CONFIG'), source.indexOf('  /* ==========================================================\n     Step-flow engine'));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup() {
  const utterances = [];
  const context = {
    AbortController,
    window: { speechSynthesis: { speak: (u) => utterances.push(u), cancel() {} } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    fetch: async () => ({ status: 501, ok: false }),
    LANGUAGES: { en: { ui: { voiceStatusDefault: 'Browser voice' } } },
    voiceStatusText: {}, currentLanguage: 'en', currentState: 'speaking', cinematicText: {},
    anime: Object.assign((opts) => opts.complete?.(), { set() {} }),
    speakWordPulses() {}, stopWordPulses() {}, setTimeout, clearTimeout,
  };
  vm.runInNewContext(block + '\nthis.api = { speakLines, stopVoice };', context);
  return { api: context.api, utterances };
}
test('mobile fallback speaks every caption sequentially and completes after speech', async () => {
  const s = setup(); let done = false;
  s.api.speakLines(['First sentence.', 'Second sentence.'], () => { done = true; });
  await flush(); assert.equal(s.utterances.length, 1); assert.equal(done, false);
  s.utterances[0].onend(); await flush();
  assert.equal(s.utterances.length, 2); assert.equal(done, false);
  s.utterances[1].onend(); await flush(); assert.equal(done, true);
});
test('interrupting mobile speech prevents remaining captions and action callbacks', async () => {
  const s = setup(); let done = false;
  s.api.speakLines(['First.', 'Second.'], () => { done = true; }); await flush();
  s.api.stopVoice(); await flush();
  assert.equal(s.utterances.length, 1); assert.equal(done, false);
});
