// JJCP API v1 도메인 요청 함수. 순수 함수 — client 를 인자로 받는다.

import type { V1Client } from './client';
import { newIdempotencyKey, V1_BASE_URL } from './client';
import type {
  CompletionTrigger,
  Story,
  ConversationCompletion,
  ConversationDetail,
  ConversationListItem,
  ConversationMessageResponse,
  DevLoginRequest,
  FirstGreetingCompletion,
  FirstGreetingMessageResponse,
  FirstGreetingSession,
  HomeResponse,
  MeResponse,
  Page,
  SendMessageRequest,
  SessionStatus,
  StartConversationRequest,
  StartConversationResponse,
  Topic,
  TokenResponse,
} from './types';

const id = (value: string) => encodeURIComponent(value);

/** 목록 응답을 Page 로 맞춘다. 명세에 키 이름이 없어 items 우선, 도메인 키(topics 등)나 배열도 받는다. */
export function toPage<T>(raw: unknown, key: string): Page<T> {
  if (Array.isArray(raw)) return { items: raw as T[], nextCursor: null };
  const body = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.items) ? body.items : Array.isArray(body[key]) ? body[key] : [];
  return {
    items: items as T[],
    nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
  };
}

// ---------- 인증 ----------

/** 웹 카카오 로그인 시작 주소. 전체 페이지 이동으로 연다. */
export function kakaoAuthorizeUrl(returnTo: string, baseUrl = V1_BASE_URL) {
  return `${baseUrl.replace(/\/$/, '')}/auth/kakao/authorize?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function devLogin(client: V1Client, body: DevLoginRequest) {
  const token = await client.request<TokenResponse>('/auth/dev/login', { body, auth: false });
  return client.acceptTokens(token);
}

export async function logout(client: V1Client) {
  try {
    await client.request<{ ok: boolean }>('/auth/logout', { body: { logoutFromKakao: false } });
  } finally {
    client.clearSession();
  }
}

export function getMe(client: V1Client, signal?: AbortSignal) {
  return client.request<MeResponse>('/me', { signal });
}

export function getHome(client: V1Client, signal?: AbortSignal) {
  return client.request<HomeResponse>('/home', { signal });
}

// ---------- 주제 ----------

export async function listTopics(
  client: V1Client,
  query: {
    recommended?: boolean;
    category?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  },
  signal?: AbortSignal,
) {
  return toPage<Topic>(await client.request<unknown>('/topics', { query, signal }), 'topics');
}

// ---------- 티키와 첫인사 ----------

export function startFirstGreeting(client: V1Client, idempotencyKey = newIdempotencyKey()) {
  return client.request<FirstGreetingSession>('/first-greeting/sessions', {
    method: 'POST',
    idempotencyKey,
  });
}

export function getFirstGreeting(client: V1Client, sessionId: string, signal?: AbortSignal) {
  return client.request<FirstGreetingSession>(`/first-greeting/sessions/${id(sessionId)}`, {
    signal,
  });
}

export function sendFirstGreetingMessage(
  client: V1Client,
  sessionId: string,
  body: SendMessageRequest,
) {
  return client.request<FirstGreetingMessageResponse>(
    `/first-greeting/sessions/${id(sessionId)}/messages`,
    { body },
  );
}

export function completeFirstGreeting(
  client: V1Client,
  sessionId: string,
  trigger: CompletionTrigger = 'BUTTON',
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<FirstGreetingCompletion>(
    `/first-greeting/sessions/${id(sessionId)}/complete`,
    { body: { trigger }, idempotencyKey },
  );
}

// ---------- 티키와 이야기 ----------

export async function listConversations(
  client: V1Client,
  query: { status?: SessionStatus[]; cursor?: string; limit?: number },
  signal?: AbortSignal,
) {
  const raw = await client.request<unknown>('/conversations', {
    query: { status: query.status?.join(','), cursor: query.cursor, limit: query.limit },
    signal,
  });
  return toPage<ConversationListItem>(raw, 'conversations');
}

export function startConversation(
  client: V1Client,
  body: StartConversationRequest,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<StartConversationResponse>('/conversations', { body, idempotencyKey });
}

export function getConversation(
  client: V1Client,
  conversationId: string,
  query: { messageCursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<ConversationDetail>(`/conversations/${id(conversationId)}`, {
    query,
    signal,
  });
}

export function getStory(client: V1Client, storyId: string, signal?: AbortSignal) {
  return client.request<{ story: Story }>(`/stories/${id(storyId)}`, { signal });
}

export function sendConversationMessage(
  client: V1Client,
  conversationId: string,
  body: SendMessageRequest,
) {
  return client.request<ConversationMessageResponse>(
    `/conversations/${id(conversationId)}/messages`,
    { body },
  );
}

export function completeConversation(
  client: V1Client,
  conversationId: string,
  trigger: CompletionTrigger = 'BUTTON',
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<ConversationCompletion>(`/conversations/${id(conversationId)}/complete`, {
    body: { trigger },
    idempotencyKey,
  });
}

/** 응답 모양은 명세에 없다. 상태만 쓰므로 느슨하게 받는다(가정). */
export function cancelConversation(
  client: V1Client,
  conversationId: string,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<{ status?: SessionStatus } | undefined>(
    `/conversations/${id(conversationId)}/cancel`,
    { body: {}, idempotencyKey },
  );
}

// --- F3 보호자·설정·기록 ---
// 명세 15(보호자 쪽)·16·17·18·22·23·26·29절. 요청 함수와, 화면이 같이 쓰는 순수 판정 함수.

import type {
  AccountMeResponse,
  AiSource,
  Consent,
  ConsentCreateRequest,
  ConsentDocumentId,
  Consultation,
  ConsultationEligibility,
  ConsultationQuestion,
  ConsultationSummary,
  DataOverview,
  DeletionReason,
  DeletionRequest,
  DeletionScope,
  ExportDetail,
  ExportInclude,
  GuardianChild,
  GuardianInvitation,
  GuardianLink,
  GuardianPermission,
  Job,
  LegalDocument,
  ProfileOut,
  ProfileUpdateRequest,
  ProgressReport,
  ReportSummary,
  RetentionNotice,
  SafetyEventList,
  SettingsResponse,
  SettingsUpdateRequest,
  ShareRequest,
  ShareRequestResponse,
  ShareStatus,
  StoryPreview,
  UnlinkResult,
} from './types';

// ---------- 프로필과 설정 (17절) ----------

/** `/me` 를 프로필 목록까지 받아 읽는다. 기존 getMe 는 모양이 좁아 그대로 둔다. */
export function getAccountMe(client: V1Client, signal?: AbortSignal) {
  return client.request<AccountMeResponse>('/me', { signal });
}

export async function getProfile(client: V1Client, profileId: string, signal?: AbortSignal) {
  const body = await client.request<{ profile: ProfileOut }>(`/profiles/${id(profileId)}`, {
    signal,
  });
  return body.profile;
}

/**
 * 낙관적 잠금. 명세 17절은 `If-Match: "3"` 헤더를 쓰지만, 이 클라이언트는 임의 헤더를 보내지
 * 않으므로 서버가 같이 받는 본문 `version` 을 쓴다. 어긋나면 409 VERSION_CONFLICT.
 */
export async function updateProfile(
  client: V1Client,
  profileId: string,
  body: ProfileUpdateRequest,
  version: number,
) {
  const result = await client.request<{ profile: ProfileOut }>(`/profiles/${id(profileId)}`, {
    method: 'PATCH',
    body: { ...body, version },
  });
  return result.profile;
}

export function getProfileSettings(client: V1Client, profileId: string, signal?: AbortSignal) {
  return client.request<SettingsResponse>(`/profiles/${id(profileId)}/settings`, { signal });
}

/** version 을 주면 설정도 같은 방식으로 충돌을 막는다. */
export function updateProfileSettings(
  client: V1Client,
  profileId: string,
  body: SettingsUpdateRequest,
  version?: number,
) {
  return client.request<SettingsResponse>(`/profiles/${id(profileId)}/settings`, {
    method: 'PATCH',
    body: version === undefined ? body : { ...body, version },
  });
}

// ---------- 약관과 동의 (26절) ----------

export async function listLegalDocuments(client: V1Client, locale = 'ko-KR', signal?: AbortSignal) {
  const body = await client.request<{ items: LegalDocument[] }>('/legal-documents', {
    query: { locale },
    auth: false,
    signal,
  });
  return body.items ?? [];
}

export async function listConsents(client: V1Client, profileId: string, signal?: AbortSignal) {
  const body = await client.request<{ items: Consent[] }>('/consents', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function recordConsents(client: V1Client, body: ConsentCreateRequest) {
  const result = await client.request<{ items: Consent[] }>('/consents', { body });
  return result.items ?? [];
}

export async function revokeConsent(client: V1Client, consentId: string) {
  const body = await client.request<{ consent: Consent }>(`/consents/${id(consentId)}`, {
    method: 'DELETE',
  });
  return body.consent;
}

// ---------- 아이·보호자 연결 (16절) ----------

export async function createGuardianInvitation(
  client: V1Client,
  body: { profileId: string; permissions?: GuardianPermission[]; expiresInMinutes?: number },
) {
  const result = await client.request<{ invitation: GuardianInvitation }>(
    '/guardian-links/invitations',
    { body },
  );
  return result.invitation;
}

export function acceptGuardianInvitation(client: V1Client, token: string) {
  return client.request<{ link: GuardianLink; profile: ProfileOut }>(
    `/guardian-links/invitations/${id(token)}/accept`,
    { method: 'POST', body: {} },
  );
}

export async function listGuardianChildren(client: V1Client, signal?: AbortSignal) {
  const body = await client.request<{ items: GuardianChild[] }>('/guardian/children', { signal });
  return body.items ?? [];
}

export async function listGuardianLinks(
  client: V1Client,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: GuardianLink[] }>('/guardian-links', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function updateGuardianLink(
  client: V1Client,
  linkId: string,
  permissions: GuardianPermission[],
) {
  const body = await client.request<{ link: GuardianLink }>(`/guardian-links/${id(linkId)}`, {
    method: 'PATCH',
    body: { permissions },
  });
  return body.link;
}

/** 연결만 끊는다. 아이 기록은 지우지 않는다(응답 dataDeleted 로 확인). */
export function deleteGuardianLink(client: V1Client, linkId: string) {
  return client.request<UnlinkResult>(`/guardian-links/${id(linkId)}`, { method: 'DELETE' });
}

// ---------- 공유 승인 (15절 보호자 쪽) ----------

/** status 를 주지 않으면 서버는 확인 대기 건만 준다. 지난 것까지 보려면 'ALL' 을 준다. */
export async function listGuardianShareRequests(
  client: V1Client,
  query: { status?: ShareStatus | 'ALL'; profileId?: string; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: ShareRequest[]; nextCursor: string | null }>(
    '/guardian/share-requests',
    { query, signal },
  );
  return { items: body.items ?? [], nextCursor: body.nextCursor ?? null };
}

/** 보호자가 읽은 버전을 반드시 같이 보낸다. 어긋나면 409 SHARE_VERSION_MISMATCH. */
export function approveShareRequest(
  client: V1Client,
  requestId: string,
  confirmedBodyVersion: number,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/approve`, {
    body: { confirmedBodyVersion, confirmedRedactions: true },
    query: { profileId },
  });
}

export function rejectShareRequest(
  client: V1Client,
  requestId: string,
  reason: string,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/reject`, {
    body: { reason },
    query: { profileId },
  });
}

export function revokeShareRequest(
  client: V1Client,
  requestId: string,
  reason?: string,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/revoke`, {
    body: { reason: reason ?? null },
    query: { profileId },
  });
}

/** 승인 전에 공개될 본문을 읽는다. 연결 보호자 계정은 못 읽을 수 있어 null 로 돌려준다. */
export async function getStoryPreview(client: V1Client, storyId: string, signal?: AbortSignal) {
  try {
    const body = await client.request<{ story: StoryPreview }>(`/stories/${id(storyId)}`, {
      signal,
    });
    return body.story ?? null;
  } catch {
    return null;
  }
}

// ---------- 성장 리포트 (18절) ----------

export function getProgressReport(
  client: V1Client,
  query: { profileId?: string; period?: '7d' | '30d' | '90d' },
  signal?: AbortSignal,
) {
  return client.request<ProgressReport>('/reports/progress', { query, signal });
}

export async function createReportSummary(
  client: V1Client,
  body: { profileId?: string; from?: string; to?: string },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ summary: ReportSummary; reused?: boolean }>(
    '/reports/summaries',
    { body, idempotencyKey },
  );
  return result;
}

export async function getReportSummary(
  client: V1Client,
  summaryId: string,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ summary: ReportSummary }>(
    `/reports/summaries/${id(summaryId)}`,
    { query: { profileId }, signal },
  );
  return body.summary;
}

// ---------- 안전 (23절) ----------

export function listSafetyEvents(
  client: V1Client,
  query: { profileId?: string; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<SafetyEventList>('/guardian/safety-events', { query, signal });
}

// ---------- 보호자 상담 (29절) ----------

export function getConsultationEligibility(
  client: V1Client,
  query: { profileId?: string; period?: string } = {},
  signal?: AbortSignal,
) {
  return client.request<ConsultationEligibility>('/guardian/consultations/eligibility', {
    query,
    signal,
  });
}

export async function listConsultations(
  client: V1Client,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: ConsultationSummary[] }>('/guardian/consultations', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function createConsultation(
  client: V1Client,
  body: { profileId?: string; period?: string },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ consultation: Consultation }>('/guardian/consultations', {
    body,
    idempotencyKey,
  });
  return result.consultation;
}

export async function getConsultation(
  client: V1Client,
  consultationId: string,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ consultation: Consultation }>(
    `/guardian/consultations/${id(consultationId)}`,
    { query: { profileId }, signal },
  );
  return body.consultation;
}

export async function askConsultationQuestion(
  client: V1Client,
  consultationId: string,
  question: string,
  profileId?: string,
) {
  const body = await client.request<{ question: ConsultationQuestion }>(
    `/guardian/consultations/${id(consultationId)}/questions`,
    { body: { question }, query: { profileId } },
  );
  return body.question;
}

// ---------- 내 데이터 (22절) ----------

export function getDataOverview(client: V1Client, signal?: AbortSignal) {
  return client.request<DataOverview>('/data/overview', { signal });
}

export async function createDataExport(
  client: V1Client,
  body: { profileId?: string; format?: 'JSON'; include?: ExportInclude[] },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ job: Job }>('/data-exports', { body, idempotencyKey });
  return result.job;
}

export function getDataExport(client: V1Client, exportId: string, signal?: AbortSignal) {
  return client.request<ExportDetail>(`/data-exports/${id(exportId)}`, { signal });
}

export async function createDataDeletionRequest(
  client: V1Client,
  body: { profileId?: string; scope: DeletionScope; confirmation: string; reason?: DeletionReason },
) {
  const result = await client.request<{ request: DeletionRequest }>('/data-deletion-requests', {
    body,
  });
  return result.request;
}

export async function getDataDeletionRequest(
  client: V1Client,
  requestId: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/data-deletion-requests/${id(requestId)}`,
    { signal },
  );
  return body.request;
}

export async function cancelDataDeletionRequest(client: V1Client, requestId: string) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/data-deletion-requests/${id(requestId)}/cancel`,
    { body: {} },
  );
  return body.request;
}

export async function createAccountDeletionRequest(
  client: V1Client,
  body: { confirmation: string; reason?: DeletionReason },
) {
  const result = await client.request<{ request: DeletionRequest }>('/account-deletion-requests', {
    body,
  });
  return result.request;
}

export async function getAccountDeletionRequest(
  client: V1Client,
  requestId: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/account-deletion-requests/${id(requestId)}`,
    { signal },
  );
  return body.request;
}

export async function cancelAccountDeletionRequest(client: V1Client, requestId: string) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/account-deletion-requests/${id(requestId)}/cancel`,
    { body: {} },
  );
  return body.request;
}

// ---------- 순수 판정·표시 함수 (화면과 테스트가 같이 쓴다) ----------

export const AI_CONSENT_DOCUMENT_ID = 'ai_conversation';

/** 지금 유효한 동의만 남긴다. 같은 문서는 가장 최근 것 하나만 본다. */
export function currentConsents(consents: Consent[]): Map<string, Consent> {
  const map = new Map<string, Consent>();
  for (const consent of consents) {
    const kept = map.get(consent.documentId);
    if (!kept || consent.grantedAt > kept.grantedAt) map.set(consent.documentId, consent);
  }
  for (const [key, consent] of map)
    if (consent.status !== 'GRANTED' || consent.current === false) map.delete(key);
  return map;
}

export function hasConsent(consents: Consent[], documentId: ConsentDocumentId): boolean {
  return currentConsents(consents).has(documentId);
}

/** 말로 답하기 권한도 보호자 동의에서 나온다(`voice_retention`). 서버가 이 기록으로 음성 API 를 연다. */
export const VOICE_CONSENT_DOCUMENT_ID = 'voice_retention';

export type AiMode = 'ai' | 'rule' | 'unknown';
export type VoiceMode = 'on' | 'off' | 'unknown';

/**
 * 아이 대화가 지금 AI 로 가는지 아닌지. 이 앱에서 가장 중요한 스위치다.
 * 로그인/프로필이 없으면 판단할 수 없으니 unknown.
 */
export function aiMode(options: {
  signedIn: boolean;
  profileId: string | null;
  consents: Consent[];
}): AiMode {
  if (!options.signedIn || !options.profileId) return 'unknown';
  return hasConsent(options.consents, AI_CONSENT_DOCUMENT_ID) ? 'ai' : 'rule';
}

export function aiModeLabel(mode: AiMode): string {
  if (mode === 'ai') return 'AI와 이야기해요';
  if (mode === 'rule') return '지금은 준비된 대사로 이야기해요';
  return 'AI 사용 여부를 아직 확인하지 못했어요';
}

/** 말로 답하기가 지금 열려 있는지. 판정 규칙은 AI 스위치와 같다. */
export function voiceMode(options: {
  signedIn: boolean;
  profileId: string | null;
  consents: Consent[];
}): VoiceMode {
  if (!options.signedIn || !options.profileId) return 'unknown';
  return hasConsent(options.consents, VOICE_CONSENT_DOCUMENT_ID) ? 'on' : 'off';
}

export function voiceModeLabel(mode: VoiceMode): string {
  if (mode === 'on') return '말로 답할 수 있어요';
  if (mode === 'off') return '지금은 글로만 답해요';
  return '말로 답하기 여부를 아직 확인하지 못했어요';
}

export function aiSourceLabel(source: AiSource | null | undefined): string {
  if (source === 'ai') return 'AI가 만든 문장';
  if (source === 'fallback') return '준비된 대사';
  return '—';
}

export const PERMISSION_LABELS: Record<GuardianPermission, string> = {
  VIEW_PROFILE: '프로필 보기',
  VIEW_STORIES: '이야기 보기',
  VIEW_REPORTS: '리포트 보기',
  REVIEW_SHARING: '공유 승인하기',
  MANAGE_DATA: '기록 내보내기·삭제',
};

export const ALL_PERMISSIONS: GuardianPermission[] = [
  'VIEW_PROFILE',
  'VIEW_STORIES',
  'VIEW_REPORTS',
  'REVIEW_SHARING',
  'MANAGE_DATA',
];

export function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission as GuardianPermission] ?? permission;
}

/** 초대 링크. 보호자가 브라우저에 붙여 넣으면 수락 화면이 열린다. */
export function invitationLink(token: string, origin?: string): string {
  const base = origin ?? (typeof location === 'undefined' ? '' : location.origin);
  return `${base.replace(/\/$/, '')}/guardian/invite/${encodeURIComponent(token)}`;
}

/** 초대 만료까지 남은 시간. 지났으면 null. */
export function minutesUntil(expiresAt: string, now = Date.now()): number | null {
  const left = Math.floor((Date.parse(expiresAt) - now) / 60000);
  return Number.isNaN(left) || left < 0 ? null : left;
}

export function retentionNoticeLines(notice: RetentionNotice | null | undefined): string[] {
  if (!notice) return [];
  const when = notice.deletesNow ? '오늘 정리할 때' : `${notice.effectiveAt.slice(0, 10)}부터`;
  return [
    notice.message,
    `지워지는 것: ${notice.targets.join(', ')}`,
    `적용 시점: ${when} · ${notice.deletesBefore.slice(0, 10)} 이전 기록`,
  ];
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: '기다리는 중',
  RUNNING: '만드는 중',
  SUCCEEDED: '다 됐어요',
  FAILED: '실패했어요',
  CANCELLED: '취소했어요',
};

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  DRAFT: '아이가 쓰는 중',
  PENDING_GUARDIAN: '보호자 확인 기다리는 중',
  APPROVED: '승인함',
  PUBLISHED: '친구들에게 보여요',
  REJECTED: '반려함',
  CANCELLED: '아이가 취소함',
  HIDDEN: '숨김',
  REVOKED: '공개를 멈춤',
};

export function shareStatusLabel(status: ShareStatus): string {
  return SHARE_STATUS_LABELS[status] ?? status;
}

/** 공개 전에 보호자가 꼭 봐야 하는 것들. 승인 화면에 그대로 적는다. */
export function sharePublicScope(request: ShareRequest): string[] {
  const audience =
    request.audience === 'PEERS'
      ? '또래 친구들'
      : request.audience === 'FAMILY'
        ? '연결된 가족'
        : '초대받은 사람';
  return [
    `보는 사람: ${audience}`,
    `이야기 제목과 본문 ${request.requestedBodyVersion}번째 판`,
    request.hideProfile ? '별명은 가리고 올려요' : '아이 별명이 함께 보여요',
    '실명, 학교 이름, 대화 원문 전체는 올라가지 않아요',
  ];
}

/** 409 응답의 details 로 "이야기가 바뀌었다"는 사실을 사람 말로 바꾼다. */
export function shareConflictMessage(details: Record<string, unknown>): string {
  const current = details.currentBodyVersion;
  return typeof current === 'number'
    ? `확인하신 뒤에 아이가 이야기를 고쳤어요. 지금은 ${current}번째 판이에요. 다시 읽고 승인해 주세요.`
    : '확인하신 뒤에 이야기가 바뀌었어요. 다시 불러온 내용을 읽고 승인해 주세요.';
}

/** 403 CONSENT_REQUIRED 의 details.documentIds 를 뽑는다. 동의 화면으로 보내는 데 쓴다. */
export function requiredConsentDocuments(details: Record<string, unknown>): string[] {
  const ids = details.documentIds;
  return Array.isArray(ids)
    ? ids.filter((value): value is string => typeof value === 'string')
    : [];
}

/** 서버 설정을 이 기기 설정(VillageProvider)으로 옮긴다. 로그아웃 상태에서는 기기 설정만 쓴다. */
export function toLocalSettings(settings: {
  ttsEnabled: boolean;
  guardianPreviewEnabled: boolean;
  theme: string;
  retentionDays: number;
}) {
  const retention = [30, 90, 180].includes(settings.retentionDays)
    ? (settings.retentionDays as 30 | 90 | 180)
    : 180;
  return {
    tts: settings.ttsEnabled,
    parentPreview: settings.guardianPreviewEnabled,
    theme: settings.theme.toLowerCase() as 'auto' | 'light' | 'dark',
    retention,
  };
}
