// F3 보호자·설정·기록 블록의 순수 함수 검사. React 없이 api/v1 모듈만 컴파일해 부른다.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/app/src/api/v1');
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (id) =>
    id.startsWith('.') ? load(resolve(dirname(path), `${id}.ts`)) : createRequire(path)(id);
  new Function('require', 'module', 'exports', source)(require, module, module.exports);
  return module.exports;
}
const endpoints = load(resolve(root, 'endpoints.ts'));
const {
  AI_CONSENT_DOCUMENT_ID,
  aiMode,
  aiModeLabel,
  aiSourceLabel,
  currentConsents,
  hasConsent,
  invitationLink,
  jobStatusLabel,
  minutesUntil,
  permissionLabel,
  requiredConsentDocuments,
  retentionNoticeLines,
  shareConflictMessage,
  sharePublicScope,
  shareStatusLabel,
  toLocalSettings,
  VOICE_CONSENT_DOCUMENT_ID,
  voiceMode,
  voiceModeLabel,
} = endpoints;

const consent = (documentId, extra = {}) => ({
  id: `cns_${documentId}`,
  profileId: 'prf_1',
  documentId,
  documentVersion: '2026-09-18',
  status: 'GRANTED',
  current: true,
  actor: { userId: 'usr_1', role: 'GUARDIAN' },
  grantedAt: '2026-09-18T00:00:00Z',
  ...extra,
});

// ---------- 동의 판정 ----------

test('currentConsents 는 철회된 동의를 지운다', () => {
  const map = currentConsents([
    consent('privacy_child'),
    consent('ai_conversation', { status: 'REVOKED', revokedAt: '2026-09-18T01:00:00Z' }),
  ]);
  assert.equal(map.has('privacy_child'), true);
  assert.equal(map.has('ai_conversation'), false);
});

test('같은 문서는 가장 최근 기록만 본다', () => {
  const map = currentConsents([
    consent('ai_conversation', { id: 'a', grantedAt: '2026-09-01T00:00:00Z' }),
    consent('ai_conversation', {
      id: 'b',
      grantedAt: '2026-09-18T00:00:00Z',
      status: 'REVOKED',
    }),
  ]);
  assert.equal(map.has('ai_conversation'), false);

  const back = currentConsents([
    consent('ai_conversation', {
      id: 'b',
      grantedAt: '2026-09-01T00:00:00Z',
      status: 'REVOKED',
    }),
    consent('ai_conversation', { id: 'c', grantedAt: '2026-09-18T00:00:00Z' }),
  ]);
  assert.equal(back.get('ai_conversation').id, 'c');
});

test('current:false 인 기록은 유효하지 않다', () => {
  assert.equal(
    hasConsent([consent('ai_conversation', { current: false })], 'ai_conversation'),
    false,
  );
});

// ---------- AI 스위치 ----------

test('aiMode 는 ai_conversation 동의로만 켜진다', () => {
  const base = { signedIn: true, profileId: 'prf_1' };
  assert.equal(aiMode({ ...base, consents: [] }), 'rule');
  assert.equal(aiMode({ ...base, consents: [consent('privacy_child')] }), 'rule');
  assert.equal(aiMode({ ...base, consents: [consent(AI_CONSENT_DOCUMENT_ID)] }), 'ai');
});

test('로그인이나 프로필이 없으면 판단하지 않는다', () => {
  assert.equal(
    aiMode({ signedIn: false, profileId: 'prf_1', consents: [consent('ai_conversation')] }),
    'unknown',
  );
  assert.equal(aiMode({ signedIn: true, profileId: null, consents: [] }), 'unknown');
});

test('aiMode 문구는 아이·보호자가 읽을 말이다', () => {
  assert.equal(aiModeLabel('ai'), 'AI와 이야기해요');
  assert.equal(aiModeLabel('rule'), '지금은 준비된 대사로 이야기해요');
  assert.equal(aiSourceLabel('fallback'), '준비된 대사');
  assert.equal(aiSourceLabel(null), '—');
});

test('voiceMode 는 voice_retention 동의로만 켜진다', () => {
  const base = { signedIn: true, profileId: 'prf_1' };
  assert.equal(voiceMode({ ...base, consents: [] }), 'off');
  assert.equal(voiceMode({ ...base, consents: [consent(AI_CONSENT_DOCUMENT_ID)] }), 'off');
  assert.equal(voiceMode({ ...base, consents: [consent(VOICE_CONSENT_DOCUMENT_ID)] }), 'on');
  assert.equal(voiceMode({ signedIn: false, profileId: 'prf_1', consents: [] }), 'unknown');
});

test('AI 스위치와 말로 답하기 스위치는 서로 독립이다', () => {
  const base = { signedIn: true, profileId: 'prf_1' };
  const only = [consent(VOICE_CONSENT_DOCUMENT_ID)];
  assert.equal(aiMode({ ...base, consents: only }), 'rule');
  assert.equal(voiceMode({ ...base, consents: only }), 'on');
  assert.equal(voiceModeLabel('on'), '말로 답할 수 있어요');
  assert.equal(voiceModeLabel('off'), '지금은 글로만 답해요');
});

// ---------- 초대 ----------

test('invitationLink 는 수락 화면 주소를 만든다', () => {
  assert.equal(
    invitationLink('ginv_abc', 'https://think-kids.netlify.app/'),
    'https://think-kids.netlify.app/guardian/invite/ginv_abc',
  );
});

test('minutesUntil 은 만료된 초대에 null 을 준다', () => {
  const now = Date.parse('2026-09-18T02:00:00Z');
  assert.equal(minutesUntil('2026-09-18T03:00:00Z', now), 60);
  assert.equal(minutesUntil('2026-09-18T01:00:00Z', now), null);
  assert.equal(minutesUntil('없는 시각', now), null);
});

test('permissionLabel 은 모르는 값을 그대로 둔다', () => {
  assert.equal(permissionLabel('MANAGE_DATA'), '기록 내보내기·삭제');
  assert.equal(permissionLabel('FUTURE_PERMISSION'), 'FUTURE_PERMISSION');
});

// ---------- 공유 승인 ----------

const shareRequest = {
  id: 'shr_1',
  storyId: 'sty_1',
  status: 'PENDING_GUARDIAN',
  audience: 'PEERS',
  hideProfile: true,
  requestedBodyVersion: 3,
  requestedAt: '2026-09-18T00:00:00Z',
  updatedAt: '2026-09-18T00:00:00Z',
};

test('sharePublicScope 는 공개되는 것과 되지 않는 것을 같이 적는다', () => {
  const lines = sharePublicScope(shareRequest);
  assert.equal(lines[0], '보는 사람: 또래 친구들');
  assert.ok(lines.some((line) => line.includes('3번째 판')));
  assert.ok(lines.some((line) => line.includes('별명은 가리고')));
  assert.ok(lines.some((line) => line.includes('학교 이름')));
});

test('별명을 가리지 않으면 그대로 말한다', () => {
  const lines = sharePublicScope({ ...shareRequest, hideProfile: false, audience: 'FAMILY' });
  assert.equal(lines[0], '보는 사람: 연결된 가족');
  assert.ok(lines.some((line) => line.includes('별명이 함께 보여요')));
});

test('shareConflictMessage 는 서버가 준 현재 판을 알려 준다', () => {
  assert.ok(shareConflictMessage({ currentBodyVersion: 6 }).includes('6번째 판'));
  assert.ok(shareConflictMessage({}).includes('다시 불러온'));
});

test('shareStatusLabel 은 상태를 한국어로 바꾼다', () => {
  assert.equal(shareStatusLabel('PENDING_GUARDIAN'), '보호자 확인 기다리는 중');
  assert.equal(shareStatusLabel('REVOKED'), '공개를 멈춤');
});

// ---------- 동의 요구 오류 ----------

test('requiredConsentDocuments 는 문자열만 뽑는다', () => {
  assert.deepEqual(requiredConsentDocuments({ documentIds: ['privacy_child', 7] }), [
    'privacy_child',
  ]);
  assert.deepEqual(requiredConsentDocuments({}), []);
});

// ---------- 보관기간 안내 ----------

test('retentionNoticeLines 는 무엇이 언제 지워지는지 말한다', () => {
  const lines = retentionNoticeLines({
    previousDays: 90,
    retentionDays: 30,
    effectiveAt: '2026-09-18T02:07:28Z',
    deletesBefore: '2026-08-19T02:07:28Z',
    deletesNow: true,
    targets: ['티키와 나눈 대화 메시지'],
    message: '보관 기간을 90일에서 30일로 줄였어요.',
  });
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes('티키와 나눈 대화 메시지'));
  assert.ok(lines[2].includes('오늘 정리할 때'));
  assert.ok(lines[2].includes('2026-08-19'));
  assert.deepEqual(retentionNoticeLines(null), []);
});

test('늘릴 때는 적용 시점을 날짜로 말한다', () => {
  const lines = retentionNoticeLines({
    previousDays: 30,
    retentionDays: 180,
    effectiveAt: '2026-09-18T02:07:28Z',
    deletesBefore: '2026-03-22T02:07:28Z',
    deletesNow: false,
    targets: ['대화에서 뽑은 정보'],
    message: '보관 기간을 늘렸어요.',
  });
  assert.ok(lines[2].includes('2026-09-18부터'));
});

// ---------- 설정 옮기기 ----------

test('toLocalSettings 는 서버 설정을 기기 설정 모양으로 바꾼다', () => {
  assert.deepEqual(
    toLocalSettings({
      ttsEnabled: false,
      guardianPreviewEnabled: true,
      theme: 'DARK',
      retentionDays: 30,
    }),
    { tts: false, parentPreview: true, theme: 'dark', retention: 30 },
  );
});

test('기기가 다루지 못하는 보관기간은 가장 긴 값으로 맞춘다', () => {
  assert.equal(
    toLocalSettings({
      ttsEnabled: true,
      guardianPreviewEnabled: false,
      theme: 'AUTO',
      retentionDays: 365,
    }).retention,
    180,
  );
});

// ---------- 작업 상태 ----------

test('jobStatusLabel 은 작업 상태를 한국어로 바꾼다', () => {
  assert.equal(jobStatusLabel('SUCCEEDED'), '다 됐어요');
  assert.equal(jobStatusLabel('WEIRD'), 'WEIRD');
});
