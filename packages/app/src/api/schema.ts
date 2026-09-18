// Generated from the local backend OpenAPI contract. Regenerate with scripts/generate-api.mjs.
export interface ApiSchema {
  AccountDeletionRequestBody: {
    confirmation: string;
    reason?: 'USER_REQUEST' | 'NO_LONGER_USED' | 'PRIVACY_CONCERN' | 'OTHER';
  };
  AccountMeResponse: {
    user: ApiSchema['MeUser'];
    profile: ApiSchema['MeProfile'] | null;
    profiles: Array<ApiSchema['MeProfileItem']>;
  };
  AchievementOut: {
    id: string;
    title: string;
    description: string;
    count: number;
    stage: string | null;
    nextTarget: number | null;
  };
  ActivityAnswer: { question: string; text: string };
  ActivityCompleteResponse: {
    session: ApiSchema['ActivitySessionOut'];
    story: ApiSchema['ActivityStoryOut'];
  };
  ActivityCounts: {
    activeDays: number;
    completedStories: number;
    continuedStories: number;
    newWords: number;
  };
  ActivityDetail: {
    id: string;
    track: 'forest' | 'lab' | 'theater';
    area: string;
    place: string;
    title: string;
    subtitle: string;
    level: string;
    tags: Array<string>;
    description: string;
    estimatedMinutes: number;
    minCharacters: number;
    intro: string;
    clue: string | null;
    steps: Array<string>;
    questions: Array<string>;
    visuals: ApiSchema['ActivityVisuals'];
  };
  ActivityDetailResponse: { activity: ApiSchema['ActivityDetail'] };
  ActivityDraft: {
    text?: string;
    answers?: Array<ApiSchema['ActivityAnswer']>;
    followup?: string;
    hints?: number;
    lab?: Record<string, unknown>;
    theater?: Record<string, unknown>;
    inquiry?: Record<string, unknown> | null;
    path?: Record<string, unknown> | null;
  };
  ActivityEvent: {
    type:
      | 'TEXT'
      | 'HINT'
      | 'TOPIC'
      | 'KEYWORD'
      | 'LAB_VALUE'
      | 'OBSERVATION'
      | 'APPROVE'
      | 'SCENE'
      | 'CHOICE'
      | 'EMOTION'
      | 'INQUIRY'
      | 'RUN';
    field?: string | null;
    value?: unknown;
  };
  ActivityItem: {
    id: string;
    track: 'forest' | 'lab' | 'theater';
    area: string;
    place: string;
    title: string;
    subtitle: string;
    level: string;
    tags: Array<string>;
    description: string;
    estimatedMinutes: number;
    minCharacters: number;
  };
  ActivityList: { items: Array<ApiSchema['ActivityItem']>; nextCursor: string | null };
  ActivityPatchRequest: { clientRevision: number; event: ApiSchema['ActivityEvent'] };
  ActivitySessionOut: {
    sessionId: string;
    activityId: string;
    track: 'forest' | 'lab' | 'theater';
    title: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    revision: number;
    step: ApiSchema['ActivityStep'];
    minCharacters: number;
    draft: ApiSchema['ActivityDraft'];
    missing: Array<ApiSchema['MissingCondition']>;
    readyToComplete: boolean;
    storyId: string | null;
    startedAt: string;
    updatedAt: string;
  };
  ActivitySessionResponse: { session: ApiSchema['ActivitySessionOut'] };
  ActivityStartRequest: { activityId: string; keyword?: string };
  ActivityStep: { index: number; label: string; total: number; writing: boolean };
  ActivityStoryOut: {
    id: string;
    title: string;
    summary: string;
    body: string;
    category: string;
    answers: Array<ApiSchema['ActivityAnswer']>;
    createdAt: string;
  };
  ActivityVisuals: { kind: string; icon: string; color: string; items: Array<string> };
  AdminReportItem: {
    id: string;
    publicStoryId: string;
    storyTitle: string;
    reason: 'UNCOMFORTABLE_CONTENT' | 'SCARY' | 'PERSONAL_INFO' | 'COPIED' | 'MEAN_WORDS' | 'OTHER';
    detail: string | null;
    status: 'OPEN' | 'RESOLVED';
    resolution: 'KEEP' | 'HIDE' | 'DELETE' | null;
    storyStatus: 'PUBLISHED' | 'PAUSED' | 'HIDDEN' | 'REVOKED' | 'DELETED';
    storyReportCount: number;
    createdAt: string;
    resolvedAt: string | null;
  };
  AdminReportList: { items: Array<ApiSchema['AdminReportItem']>; nextCursor: string | null };
  AdminSafetyEventList: {
    items: Array<ApiSchema['AdminSafetyEventOut']>;
    nextCursor: string | null;
  };
  AdminSafetyEventOut: {
    id: string;
    category: string;
    needsAttention: boolean;
    guidance: string;
    occurredAt: string;
    profileId: string | null;
    userId: string | null;
  };
  AdventureIn: {
    category: string;
    title: string;
    hook: string;
    followUps?: Array<string>;
    visibility: 'family' | 'circle' | 'community';
    circleId?: string | null;
  };
  AnswerIn: { index: number; chosen: number };
  ApproveRequest: { confirmedBodyVersion: number; confirmedRedactions?: boolean };
  AudioFormat: { encoding?: string; sampleRate?: number; channels?: number };
  AuthUser: { id: string; role: string; needsFirstGreeting: boolean };
  BeliefOut: {
    id: 'brightness_longer' | 'light_higher_longer' | 'light_irrelevant' | 'distance_irrelevant';
    line: string;
    variable: 'lightHeight' | 'stickHeight' | 'distance' | 'brightness';
    claimedEffect: 'longer' | 'shorter' | 'same';
  };
  BlockLogEntry: {
    stage: string;
    surface: string;
    term?: string | null;
    reason: string;
    at: string;
  };
  Body_transcribe_api_v1_speech_transcriptions_post: { file: string };
  Body_transcribe_speech_transcriptions_post: { file: string };
  BookCover: { theme?: string | null; emoji?: string | null };
  BookCreateRequest: {
    title: string;
    storyIds?: Array<string>;
    generateIntroduction?: boolean;
    cover?: ApiSchema['BookCover'] | null;
  };
  BookDetail: {
    id: string;
    title: string;
    introduction: string;
    cover: ApiSchema['BookCover'] | null;
    status: 'DRAFT' | 'COMPLETED';
    storyCount: number;
    version: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    introductionSource: 'ai' | 'fallback' | null;
    stories: Array<ApiSchema['StorySummary']>;
  };
  BookIn: { title: string; storyIds: Array<string> };
  BookList: { items: Array<ApiSchema['BookSummary']>; nextCursor: string | null };
  BookOut: {
    id: string;
    title: string;
    stories: Array<ApiSchema['app__schemas__talk__StoryOut']>;
    createdAt: string;
  };
  BookPatchRequest: {
    title?: string | null;
    introduction?: string | null;
    cover?: ApiSchema['BookCover'] | null;
    storyIds?: Array<string> | null;
    version?: number | null;
  };
  BookResponse: { book: ApiSchema['BookDetail'] };
  BookStoryAddRequest: { storyId: string; position?: number | null };
  BookSummary: {
    id: string;
    title: string;
    introduction: string;
    cover: ApiSchema['BookCover'] | null;
    status: 'DRAFT' | 'COMPLETED';
    storyCount: number;
    version: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  CallLogEntry: {
    purpose: string;
    model: string;
    latencyMs: number;
    ok: boolean;
    code: string;
    at: string;
  };
  CancelResponse: {
    conversationId: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    cancelledAt: string | null;
  };
  CategoryCount: { category: string; completedStories: number };
  CategoryIn: { name: string };
  CategoryOut: { id: string; name: string; kind: 'system' | 'custom'; visual: string };
  ChallengeCandidate: { id: string; summary: string };
  ChallengeOut: {
    id:
      'tall_stick' | 'far_light' | 'low_light_correct' | 'bright_same_correct' | 'confounded_claim';
    line: string;
    base: Record<string, string>;
    compare: Record<string, string>;
    baseLength: number;
    compareLength: number;
    friendPrediction: 'longer' | 'shorter' | 'same';
    confounded: boolean;
    friendCorrect: boolean;
  };
  ChallengeRequest: {
    beliefId:
      'brightness_longer' | 'light_higher_longer' | 'light_irrelevant' | 'distance_irrelevant';
    convinced: boolean;
    experiments?: Array<ApiSchema['ExperimentIn']>;
    finalText?: string;
    finalReason?: string;
    inputOrigin?: 'example' | 'adult' | 'child';
  };
  ChallengeResponse: {
    ai: boolean;
    error?: string | null;
    source: 'ai' | 'fallback';
    challenge: ApiSchema['ChallengeOut'];
    finalClaims: Array<ApiSchema['ClaimOut']>;
  };
  ChildContext: {
    name?: string | null;
    ageBand?: string | null;
    grade?: string | null;
    interests?: Array<string>;
    followupIntensity?: 'gentle' | 'normal' | 'deep';
    vocabLevel?: 'easy' | 'normal' | 'rich';
  };
  ChildCreateRequest: { nickname?: string; tester?: boolean };
  ChildOut: {
    id: string;
    nickname: string;
    grade: number | null;
    affiliation: 'elementary' | 'homeschool' | 'other' | null;
    likes: Array<string>;
    wantToLearn: Array<string>;
    profileConfirmed: boolean;
    tester: boolean;
    permissions: ApiSchema['Permissions'];
  };
  ChoiceOption: { id: string; label: string };
  CircleCreateRequest: { name: string };
  CircleJoinRequest: { code: string };
  CircleOut: { id: string; name: string; code: string };
  ClaimOut: {
    variable: 'lightHeight' | 'stickHeight' | 'distance' | 'brightness';
    effect: 'longer' | 'shorter' | 'same' | 'unknown';
  };
  Clarify: { question: string; options: Array<ApiSchema['ClarifyOption']> };
  ClarifyOption: { label: string; program: Array<ApiSchema['Step']> };
  CommunityDetailResponse: { story: ApiSchema['PublicStoryDetail'] };
  CommunityList: { items: Array<ApiSchema['PublicStoryOut']>; nextCursor: string | null };
  CommunityReportCreate: {
    reason?:
      'UNCOMFORTABLE_CONTENT' | 'SCARY' | 'PERSONAL_INFO' | 'COPIED' | 'MEAN_WORDS' | 'OTHER';
    detail?: string | null;
  };
  CommunityReportOut: {
    id: string;
    publicStoryId: string;
    reason: 'UNCOMFORTABLE_CONTENT' | 'SCARY' | 'PERSONAL_INFO' | 'COPIED' | 'MEAN_WORDS' | 'OTHER';
    detail: string | null;
    status: 'OPEN' | 'RESOLVED';
    resolution?: 'KEEP' | 'HIDE' | 'DELETE' | null;
    createdAt: string;
  };
  CommunityReportResponse: {
    report: ApiSchema['CommunityReportOut'];
    storyStatus: 'PUBLISHED' | 'PAUSED' | 'HIDDEN' | 'REVOKED' | 'DELETED';
  };
  CommunityStoryPreview: { id: string; title: string };
  CompleteRequest: { trigger?: 'BUTTON' | 'CHAT_END_INTENT' };
  ConsentActor: { userId: string; role: 'GUARDIAN' };
  ConsentCreateRequest: {
    profileId: string;
    items: Array<ApiSchema['ConsentItemRequest']>;
    actor?: string | null;
  };
  ConsentItemRequest: { documentId: string; version?: string | null; agreed?: boolean };
  ConsentListResponse: { items: Array<ApiSchema['ConsentOut']>; nextCursor?: string | null };
  ConsentOut: {
    id: string;
    profileId: string;
    documentId: string;
    documentVersion: string;
    status: 'GRANTED' | 'REVOKED';
    current: boolean;
    actor: ApiSchema['ConsentActor'];
    grantedAt: string;
    revokedAt?: string | null;
  };
  ConsentResponse: { consent: ApiSchema['ConsentOut'] };
  ConsentWriteResponse: { items: Array<ApiSchema['ConsentOut']> };
  ConsultationBody: {
    observedBehaviors: Array<string>;
    examples: Array<string>;
    questionsToTry: Array<string>;
    evidenceStoryIds: Array<string>;
  };
  ConsultationCreate: { profileId?: string | null; period?: string | null };
  ConsultationList: { items: Array<ApiSchema['ConsultationSummary']>; nextCursor: string | null };
  ConsultationQuestionCreate: { question: string };
  ConsultationQuestionOut: {
    id: string;
    question: string;
    answer: string;
    source: 'ai' | 'fallback';
    createdAt: string;
  };
  ConsultationQuestionResponse: { question: ApiSchema['ConsultationQuestionOut'] };
  ConsultationResponse: { consultation: ApiSchema['app__v1__report_schemas__ConsultationOut'] };
  ConsultationSummary: {
    id: string;
    profileId: string;
    period: string;
    source: 'ai' | 'fallback';
    createdAt: string;
  };
  ConversationCompletion: {
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    story: ApiSchema['app__v1__schemas_conversation__StoryOut'];
  };
  ConversationDetail: {
    conversationId: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    topic: ApiSchema['TopicRef'];
    messages: Array<ApiSchema['MessageOut']>;
    nextCursor: string | null;
    currentInteraction: ApiSchema['Interaction'] | null;
    readiness: ApiSchema['StoryReadiness'];
    storyId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  ConversationList: { items: Array<ApiSchema['ConversationSummary']>; nextCursor: string | null };
  ConversationMessageResponse: {
    userMessage: ApiSchema['MessageOut'];
    assistantMessage: ApiSchema['MessageOut'];
    nextInteraction: ApiSchema['Interaction'] | null;
    readiness: ApiSchema['StoryReadiness'];
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    endIntentDetected: boolean;
    completion?: ApiSchema['ConversationCompletion'] | null;
  };
  ConversationStartRequest: { topicId: string; inputMode?: 'TEXT' | 'VOICE'; locale?: string };
  ConversationStartResponse: {
    conversationId: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    topic: ApiSchema['TopicRef'];
    assistantMessage: ApiSchema['MessageOut'];
    nextInteraction: ApiSchema['Interaction'] | null;
    readiness: ApiSchema['StoryReadiness'];
  };
  ConversationSummary: {
    conversationId: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    topic: ApiSchema['TopicRef'];
    readiness: ApiSchema['StoryReadiness'];
    storyId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  CreatedTopic: { id: string; title: string; category: string; source: 'USER' };
  CustomTopicIn: { title: string; hook: string };
  DataOverview: {
    profileId?: string | null;
    counts: Record<string, number>;
    retention: Record<string, number>;
    hiddenScopes?: Array<string>;
    pendingDeletionRequestId?: string | null;
    generatedAt: string;
  };
  DayOut: { date: string; weekdayLabel: string; active: boolean };
  DecisionIn: { approve: boolean };
  DeletionRequestBody: {
    profileId?: string | null;
    scope?: 'ALL_CHILD_DATA' | 'CONVERSATIONS' | 'STORIES' | 'WORDBOOK' | 'EXPORTS';
    confirmation: string;
    reason?: 'USER_REQUEST' | 'NO_LONGER_USED' | 'PRIVACY_CONCERN' | 'OTHER';
  };
  DeletionRequestOut: {
    id: string;
    kind: 'DATA' | 'ACCOUNT';
    scope: string;
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    reason: string;
    profileId?: string | null;
    targetId?: string | null;
    hiddenAt?: string | null;
    effectiveAt: string;
    completedAt?: string | null;
    cancelledAt?: string | null;
    cancellable: boolean;
    result?: Record<string, number>;
    createdAt: string;
  };
  DeletionRequestResponse: { request: ApiSchema['DeletionRequestOut'] };
  DevLoginRequest: { deviceKey: string; nickname?: string | null };
  Device: {
    id: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    installationId?: string | null;
    appVersion?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  DeviceRequest: {
    platform: 'IOS' | 'ANDROID' | 'WEB';
    pushToken: string;
    installationId?: string | null;
    appVersion?: string | null;
    locale?: string;
  };
  DeviceResponse: { device: ApiSchema['Device'] };
  DeviceTokenResponse: { childId: string; childToken: string; notice: string };
  DiagnosticAnswer: { prompt: string; answer?: string };
  DiagnosticRequest: {
    answers?: Array<ApiSchema['DiagnosticAnswer']>;
    child?: ApiSchema['ChildContext'];
  };
  DiagnosticResponse: {
    ai: boolean;
    error?: string | null;
    followupIntensity: 'gentle' | 'normal' | 'deep';
    vocabLevel: 'easy' | 'normal' | 'rich';
    rationale: string;
  };
  Download: { url: string; token: string; expiresAt: string };
  EligibilityResponse: {
    profileId: string;
    eligible: boolean;
    period: string;
    reason: string;
    daysRemaining: number;
    completedStories: number;
    alreadyCreated: boolean;
  };
  ExperimentIn: { base: ApiSchema['SetupIn']; compare: ApiSchema['SetupIn'] };
  ExplainRequest: { text: string };
  ExplainResponse: { ai: boolean; error?: string | null; words: Array<ApiSchema['WordNote']> };
  ExportDetail: {
    job: ApiSchema['Job'];
    include: Array<string>;
    byteSize: number;
    download?: ApiSchema['Download'] | null;
  };
  ExportRequest: {
    profileId?: string | null;
    format?: 'JSON';
    include?: Array<'PROFILE' | 'CONVERSATIONS' | 'STORIES' | 'WORDBOOK' | 'REPORTS'>;
  };
  FamilyCreateResponse: { familyId: string; guardianToken: string; notice: string };
  FavoriteResponse: { story: ApiSchema['FavoriteState'] };
  FavoriteState: { id: string; favorite: boolean; version: number; updatedAt: string };
  FrequencyOut: {
    talksStarted: number;
    talksCompleted: number;
    activeMinutes: number;
    daysActive7: number;
    daysActive30: number;
    last7: Array<ApiSchema['DayOut']>;
  };
  GreetingCompletion: {
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    profile: ApiSchema['app__v1__schemas_conversation__ProfileOut'];
    summary: string;
    completedAt: string;
  };
  GreetingMessageResponse: {
    userMessage: ApiSchema['MessageOut'];
    assistantMessage: ApiSchema['MessageOut'];
    nextInteraction: ApiSchema['Interaction'] | null;
    profileDraft: ApiSchema['ProfileDraftOut'];
    readiness: ApiSchema['GreetingReadiness'];
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    endIntentDetected: boolean;
    completion?: ApiSchema['GreetingCompletion'] | null;
  };
  GreetingReadiness: { ready: boolean; progress: number; missing: Array<string> };
  GreetingSessionOut: {
    sessionId: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    resumed?: boolean;
    messages: Array<ApiSchema['MessageOut']>;
    nextCursor?: string | null;
    currentInteraction: ApiSchema['Interaction'] | null;
    profileDraft: ApiSchema['ProfileDraftOut'];
    readiness: ApiSchema['GreetingReadiness'];
  };
  GuardianChildListResponse: {
    items: Array<ApiSchema['GuardianChildOut']>;
    nextCursor?: string | null;
  };
  GuardianChildOut: {
    profileId: string;
    linkId: string;
    nickname: string;
    gradeOrAgeBand?: string | null;
    role: 'OWNER' | 'GUARDIAN';
    permissions: Array<string>;
    isDefault: boolean;
    needsFirstGreeting: boolean;
    updatedAt: string;
  };
  GuardianConsent: { guardian?: boolean };
  HTTPValidationError: { detail?: Array<ApiSchema['ValidationError']> };
  Heard: { phrase: string; meaning: string };
  HomeProfile: { nickname: string | null; needsFirstGreeting: boolean };
  HomeResponse: {
    profile: ApiSchema['HomeProfile'];
    recommendations: Array<ApiSchema['Recommendation']>;
    resume: ApiSchema['ResumeOut'] | null;
    recentWords: Array<ApiSchema['RecentWord']>;
    communityStories: Array<ApiSchema['CommunityStoryPreview']>;
    weeklyActivity: ApiSchema['WeeklyActivity'];
  };
  Inner: {
    op: 'move' | 'turn' | 'stop' | 'if';
    count?: number | null;
    until?: 'blocked' | null;
    dir?: 'left' | 'right' | null;
    sensor?: 'front' | 'left' | 'right' | null;
    state?: 'open' | 'blocked' | null;
    then?: Array<ApiSchema['Leaf']>;
    else?: Array<ApiSchema['Leaf']>;
  };
  Interaction: {
    type: 'TEXT' | 'SINGLE_CHOICE';
    questionId: string;
    options?: Array<ApiSchema['ChoiceOption']>;
  };
  InterpretRequest: {
    prediction: 'longer' | 'shorter' | 'same' | 'unknown';
    reason?: string;
    reasonSkipped?: boolean;
    inputOrigin?: 'example' | 'adult' | 'child';
  };
  InterpretResponse: {
    ai: boolean;
    error?: string | null;
    source: 'ai' | 'fallback';
    claims: Array<ApiSchema['ClaimOut']>;
    uncertain: boolean;
    restatement: string;
    friendBeliefId:
      'brightness_longer' | 'light_higher_longer' | 'light_irrelevant' | 'distance_irrelevant';
    friendLine: string;
  };
  InvitationAcceptResponse: {
    link: ApiSchema['LinkOut'];
    profile: ApiSchema['app__v1__schemas_accounts__ProfileOut'];
  };
  InvitationCreateRequest: {
    profileId: string;
    permissions?: Array<
      'VIEW_PROFILE' | 'VIEW_STORIES' | 'VIEW_REPORTS' | 'REVIEW_SHARING' | 'MANAGE_DATA'
    > | null;
    expiresInMinutes?: number | null;
  };
  InvitationOut: {
    id: string;
    profileId: string;
    token: string;
    permissions: Array<string>;
    expiresAt: string;
    createdAt: string;
  };
  InvitationResponse: { invitation: ApiSchema['InvitationOut'] };
  Job: {
    id: string;
    type: 'DATA_EXPORT' | 'DATA_DELETION' | 'ACCOUNT_DELETION';
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    createdAt: string;
    updatedAt?: string | null;
    completedAt?: string | null;
    error?: string | null;
  };
  JobResponse: { job: ApiSchema['Job'] };
  LabRequest: { topic: string; child?: ApiSchema['ChildContext'] };
  LabResponse: {
    ai: boolean;
    error?: string | null;
    title: string;
    ctrlLabel: string;
    ask: string;
    concept: string;
    quiz?: Array<ApiSchema['QuizItem']>;
  };
  Leaf: {
    op: 'move' | 'turn' | 'stop';
    count?: number | null;
    until?: 'blocked' | null;
    dir?: 'left' | 'right' | null;
  };
  LegalDocumentListResponse: {
    items: Array<ApiSchema['LegalDocumentOut']>;
    nextCursor?: string | null;
  };
  LegalDocumentOut: {
    id: string;
    title: string;
    version: string;
    locale: string;
    required: boolean;
    summary: string;
    body: string;
    draft?: boolean;
    draftNotice: string;
  };
  LevelOut: { id: string; label: string };
  LibraryScript: {
    id: string;
    keyword: string;
    title: string;
    scenes: Array<ApiSchema['Scene']>;
    learn: string;
    parentNote: string;
  };
  LinkListResponse: { items: Array<ApiSchema['LinkOut']>; nextCursor?: string | null };
  LinkOut: {
    id: string;
    profileId: string;
    userId: string;
    role: 'OWNER' | 'GUARDIAN';
    permissions: Array<string>;
    status: 'ACTIVE' | 'REVOKED';
    createdAt: string;
    revokedAt?: string | null;
  };
  LinkResponse: { link: ApiSchema['LinkOut'] };
  LinkUpdateRequest: {
    permissions: Array<
      'VIEW_PROFILE' | 'VIEW_STORIES' | 'VIEW_REPORTS' | 'REVIEW_SHARING' | 'MANAGE_DATA'
    >;
  };
  LogoutRequest: { refreshToken?: string | null; logoutFromKakao?: boolean };
  LogoutResponse: { ok?: boolean };
  MeProfile: {
    id: string;
    nickname: string;
    gradeOrAgeBand: string | null;
    interests: Array<string>;
    growthGoal: string | null;
  };
  MeProfileItem: {
    id: string;
    nickname: string;
    gradeOrAgeBand?: string | null;
    interests?: Array<string>;
    growthGoal?: string | null;
    role: 'OWNER' | 'GUARDIAN';
    permissions: Array<string>;
    isDefault: boolean;
    needsFirstGreeting: boolean;
  };
  MeUser: { id: string; role: string; needsFirstGreeting: boolean };
  MessageInput: { type: 'TEXT' | 'SINGLE_CHOICE'; text?: string | null; optionId?: string | null };
  MessageOut: {
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    questionId?: string | null;
    answer?: ApiSchema['app__v1__schemas_conversation__AnswerOut'] | null;
    interaction?: ApiSchema['Interaction'] | null;
    source?: 'ai' | 'fallback' | null;
    createdAt: string;
  };
  MessageRequest: {
    clientMessageId: string;
    questionId?: string | null;
    input: ApiSchema['MessageInput'];
  };
  MissingCondition: { code: string; message: string };
  MissionResponse: {
    id: string;
    question: string;
    variables: Array<ApiSchema['VariableOut']>;
    baseSetup: Record<string, string>;
    table: Array<ApiSchema['TableRow']>;
    designFeedback: Record<string, string>;
    friendBeliefs: Array<ApiSchema['BeliefOut']>;
    truth: Record<string, string>;
    facts: Record<string, string>;
    modelNote: string;
    parentQuestion: string;
    childDataMode: 'demo' | 'child';
    aiAvailable: boolean;
  };
  MobileDevice: { installationId?: string | null; appVersion?: string | null };
  MobileLoginRequest: {
    platform: 'ANDROID' | 'IOS';
    kakaoAccessToken: string;
    device?: ApiSchema['MobileDevice'] | null;
  };
  NotificationItem: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    readAt?: string | null;
    createdAt: string;
  };
  NotificationList: {
    items: Array<ApiSchema['NotificationItem']>;
    unreadCount: number;
    nextCursor?: string | null;
  };
  NotificationResponse: { notification: ApiSchema['NotificationItem'] };
  NotificationSettings: {
    pushEnabled: boolean;
    shareRequests: boolean;
    safetyNotices: boolean;
    activitySummary: boolean;
    updatedAt: string;
  };
  NotificationSettingsPatch: {
    pushEnabled?: boolean | null;
    shareRequests?: boolean | null;
    safetyNotices?: boolean | null;
    activitySummary?: boolean | null;
  };
  NotificationSettingsResponse: { settings: ApiSchema['NotificationSettings'] };
  ObservedBehaviors: {
    fullSentenceResponses: number;
    reasonExplanations: number;
    alternativeIdeas: number;
    revisedIdeas: number;
  };
  OkResponse: { ok?: boolean };
  OnboardingMessage: { text: string; inputMode?: 'text' | 'voice' };
  OnboardingState: {
    ai: boolean;
    error?: string | null;
    reply: string;
    profile: ApiSchema['ProfileDraft'];
    missing: Array<string>;
    done: boolean;
    notes?: Array<string>;
  };
  PathReactRequest: {
    text?: string;
    program?: Array<ApiSchema['Step']>;
    mapId?: string;
    attempt?: number;
    inputOrigin?: 'example' | 'adult' | 'child';
    result: ApiSchema['RunResult'];
    challengeCandidates?: Array<ApiSchema['ChallengeCandidate']>;
  };
  PathReactResponse: {
    ai: boolean;
    error?: string | null;
    source: 'ai' | 'fallback';
    tikiLine: string;
    question: string | null;
    challengeId: string | null;
    challengeLine: string | null;
  };
  PathRevision: { clientRevision: number };
  PathTeachRequest: {
    text: string;
    program?: Array<ApiSchema['Step']>;
    mapId?: string;
    attempt?: number;
    inputOrigin?: 'example' | 'adult' | 'child';
    pendingClarify?: ApiSchema['PendingClarify'] | null;
  };
  PathTeachResponse: {
    ai: boolean;
    error?: string | null;
    source: 'ai' | 'fallback';
    kind: 'program' | 'clarify' | 'unmapped';
    program: Array<ApiSchema['Step']>;
    heard: Array<ApiSchema['Heard']>;
    clarify: ApiSchema['Clarify'] | null;
    tikiLine: string;
  };
  PathText: { clientRevision: number; text: string };
  PendingClarify: { question: string; chosen: string };
  PeriodOut: { from: string; to: string };
  Permissions: { voice?: boolean; browseShared?: boolean; publishRequest?: boolean };
  ProfileConfirmRequest: {
    nickname?: string | null;
    grade?: number | null;
    affiliation?: 'elementary' | 'homeschool' | 'other' | null;
    likes?: Array<string> | null;
    wantToLearn?: Array<string> | null;
  };
  ProfileCreateRequest: {
    nickname: string;
    schoolOrGroup?: string | null;
    gradeOrAgeBand?: string | null;
    interests?: Array<string>;
    growthGoal?: string | null;
    makeDefault?: boolean;
  };
  ProfileDraft: {
    nickname?: string | null;
    grade?: number | null;
    affiliation?: 'elementary' | 'homeschool' | 'other' | null;
    likes?: Array<string>;
    wantToLearn?: Array<string>;
  };
  ProfileDraftOut: {
    nickname?: string | null;
    schoolOrGroup?: string | null;
    gradeOrAgeBand?: string | null;
    interests?: Array<string>;
    interestDetails?: Array<string>;
    growthGoal?: string | null;
  };
  ProfileListResponse: {
    items: Array<ApiSchema['app__v1__schemas_accounts__ProfileOut']>;
    nextCursor?: string | null;
  };
  ProfileResponse: { profile: ApiSchema['app__v1__schemas_accounts__ProfileOut'] };
  ProfileUpdateRequest: {
    nickname?: string | null;
    schoolOrGroup?: string | null;
    gradeOrAgeBand?: string | null;
    interests?: Array<string> | null;
    growthGoal?: string | null;
    makeDefault?: boolean | null;
    version?: number | null;
  };
  ProgressOut: {
    frequency: ApiSchema['FrequencyOut'];
    achievements: Array<ApiSchema['AchievementOut']>;
    words: ApiSchema['WordsProgressOut'];
    stories: number;
    books: number;
  };
  ProgressResponse: {
    profileId: string;
    period: ApiSchema['PeriodOut'];
    activity: ApiSchema['ActivityCounts'];
    observedBehaviors: ApiSchema['ObservedBehaviors'];
    timeline: Array<ApiSchema['TimelinePoint']>;
    categoryBreakdown: Array<ApiSchema['CategoryCount']>;
    notice?: string;
  };
  PublicAuthor: { displayName: string; ageBand: string };
  PublicStoryDetail: {
    id: string;
    title: string;
    excerpt: string;
    author: ApiSchema['PublicAuthor'];
    category: string;
    recommendationCount: number;
    recommendedByMe: boolean;
    recommendationReason: string;
    guardianApproved?: boolean;
    publishedAt: string;
    body: string;
    thoughtJourney: Record<string, unknown>;
    mine?: boolean;
  };
  PublicStoryOut: {
    id: string;
    title: string;
    excerpt: string;
    author: ApiSchema['PublicAuthor'];
    category: string;
    recommendationCount: number;
    recommendedByMe: boolean;
    recommendationReason: string;
    guardianApproved?: boolean;
    publishedAt: string;
  };
  QuizAnswerRequest: { questionId: string; optionId: string; clientAnsweredAt?: string | null };
  QuizAnswerResponse: {
    result: ApiSchema['QuizAnswerResult'];
    entry: ApiSchema['WordbookEntryOut'];
    quiz: ApiSchema['QuizProgress'];
  };
  QuizAnswerResult: { questionId: string; correct: boolean; correctOptionId: string };
  QuizItem: { q: string; options: Array<string>; answer: number };
  QuizOption: { id: string; label: string };
  QuizOut: {
    id: string;
    assignedBy: 'child' | 'guardian';
    questions: Array<ApiSchema['app__schemas__library__QuizQuestionOut']>;
    answers: Array<ApiSchema['app__schemas__library__AnswerOut']>;
    completed: boolean;
    createdAt: string;
  };
  QuizProgress: {
    id: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    questionCount: number;
    answeredCount: number;
  };
  RealtimeSessionResponse: { clientSecret: string; expiresAt: number; model: string };
  RecentWord: { word: string; meaning: string };
  Recommendation: {
    topicId: string;
    title: string;
    category: string;
    reason: string;
    estimatedMinutes: number;
  };
  RecommendationResponse: {
    storyId: string;
    recommendationCount: number;
    recommendedByMe: boolean;
  };
  RefreshRequest: { refreshToken?: string | null };
  RejectRequest: { reason: string };
  ReportRequest: { sentences?: Array<string>; weeklyScores?: Array<ApiSchema['WeeklyScore']> };
  ReportResponse: { ai: boolean; error?: string | null; summary: string; next: string };
  ResolveRequest: { resolution: 'KEEP' | 'HIDE' | 'DELETE'; note?: string | null };
  ResolveResponse: { report: ApiSchema['AdminReportItem'] };
  ResumeOut: {
    conversationId: string;
    title: string;
    status: 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
    updatedAt: string;
  };
  RetentionNotice: {
    previousDays: number;
    retentionDays: number;
    effectiveAt: string;
    deletesBefore: string;
    deletesNow: boolean;
    targets: Array<string>;
    message: string;
  };
  RevokeRequest: { reason?: string | null };
  RubricRequest: {
    question: string;
    answer: string;
    child?: ApiSchema['ChildContext'];
    consent?: ApiSchema['GuardianConsent'] | null;
  };
  RubricResponse: {
    ai: boolean;
    error?: string | null;
    observe: number;
    reason: number;
    express: number;
    quote: string;
    followup: string;
    comment: string;
  };
  RunResult: {
    outcome: 'arrived' | 'splashed' | 'bumped' | 'ended' | 'loop' | 'tooLong';
    moves: number;
    stopStepLabel?: string | null;
    previousOutcome?: string | null;
    changedSinceLast?: boolean;
  };
  SafetyEventList: {
    items: Array<ApiSchema['app__v1__social_schemas__SafetyEventOut']>;
    nextCursor: string | null;
    notice: string;
  };
  Scene: { narration: string; line: string; emotion: string };
  ScriptRequest: { keyword: string; child?: ApiSchema['ChildContext'] };
  ScriptResponse: {
    ai: boolean;
    error?: string | null;
    safe: boolean;
    reason: string;
    title?: string;
    scenes?: Array<ApiSchema['Scene']>;
    learn?: string;
  };
  SettingsOut: {
    profileId: string;
    voiceEnabled: boolean;
    ttsEnabled: boolean;
    guardianPreviewEnabled: boolean;
    theme: 'AUTO' | 'LIGHT' | 'DARK';
    retentionDays: number;
    version: number;
    updatedAt: string;
  };
  SettingsResponse: {
    settings: ApiSchema['SettingsOut'];
    retentionNotice?: ApiSchema['RetentionNotice'] | null;
  };
  SettingsUpdateRequest: {
    voiceEnabled?: boolean | null;
    ttsEnabled?: boolean | null;
    guardianPreviewEnabled?: boolean | null;
    theme?: 'AUTO' | 'LIGHT' | 'DARK' | null;
    retentionDays?: 30 | 90 | 180 | 365 | null;
    version?: number | null;
  };
  SetupIn: {
    lightHeight: 'low' | 'mid' | 'high';
    stickHeight: 'short' | 'tall';
    distance: 'near' | 'far';
    brightness: 'dim' | 'bright';
  };
  ShareOut: {
    id: string;
    kind: string;
    title: string;
    authorLabel: string;
    visibility: string;
    status: string;
    body: Record<string, unknown>;
    createdAt: string;
    publishedAt: string | null;
  };
  ShareRequest: {
    kind: 'story' | 'book';
    refId: string;
    visibility: 'family' | 'circle' | 'community';
    circleId?: string | null;
  };
  ShareRequestCreate: { audience?: 'PEERS' | 'FAMILY' | 'INVITED'; hideProfile?: boolean };
  ShareRequestList: { items: Array<ApiSchema['ShareRequestOut']>; nextCursor: string | null };
  ShareRequestOut: {
    id: string;
    storyId: string;
    status:
      | 'DRAFT'
      | 'PENDING_GUARDIAN'
      | 'APPROVED'
      | 'PUBLISHED'
      | 'REJECTED'
      | 'CANCELLED'
      | 'HIDDEN'
      | 'REVOKED';
    audience: 'PEERS' | 'FAMILY' | 'INVITED';
    hideProfile: boolean;
    requestedBodyVersion: number;
    confirmedBodyVersion?: number | null;
    publicStoryId?: string | null;
    rejectReason?: string | null;
    pendingReason?: string | null;
    requestedAt: string;
    decidedAt?: string | null;
    updatedAt: string;
  };
  ShareRequestResponse: {
    shareRequest: ApiSchema['ShareRequestOut'];
    publicStory?: ApiSchema['PublicStoryOut'] | null;
  };
  SourceConversation: {
    conversationId: string;
    topic: ApiSchema['TopicRef'];
    status: string;
    messageCount: number;
    startedAt: string;
    completedAt: string | null;
  };
  Step: {
    op: 'move' | 'turn' | 'stop' | 'if' | 'repeat';
    count?: number | null;
    until?: 'blocked' | null;
    dir?: 'left' | 'right' | null;
    sensor?: 'front' | 'left' | 'right' | null;
    state?: 'open' | 'blocked' | null;
    then?: Array<ApiSchema['Leaf']>;
    else?: Array<ApiSchema['Leaf']>;
    body?: Array<ApiSchema['Inner']>;
  };
  StoryDetail: {
    story: ApiSchema['app__v1__schemas_conversation__StoryOut'];
    wordsUsed: Array<ApiSchema['WordUsed']>;
    sourceConversation: ApiSchema['SourceConversation'] | null;
  };
  StoryEdited: { story: ApiSchema['app__v1__schemas_conversation__StoryOut']; edited: boolean };
  StoryList: { items: Array<ApiSchema['StorySummary']>; nextCursor: string | null };
  StoryPatchRequest: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    thoughtJourney?: ApiSchema['ThoughtJourneyPatch'] | null;
    version?: number | null;
  };
  StoryReadiness: {
    ready: boolean;
    progress: number;
    coveredDimensions: Array<string>;
    missingDimensions: Array<string>;
  };
  StorySceneOut: { heading: string; text: string; fromTurnIds: Array<string>; visual: string };
  StorySummary: {
    id: string;
    title: string;
    summary: string;
    category: string;
    favorite: boolean;
    version: number;
    sourceConversationId: string;
    createdAt: string;
    updatedAt: string;
  };
  StreamTicketRequest: {
    conversationId?: string | null;
    questionId?: string | null;
    locale?: string;
    audio?: ApiSchema['AudioFormat'];
  };
  StreamTicketResponse: {
    streamId: string;
    ticket: string;
    webSocketUrl: string;
    expiresAt: string;
  };
  SummaryBody: {
    highlights: Array<string>;
    suggestions: Array<string>;
    conversationTips: Array<string>;
    evidenceStoryIds: Array<string>;
  };
  SummaryCreate: { profileId?: string | null; from?: string | null; to?: string | null };
  SummaryOut: {
    id: string;
    profileId: string;
    period: ApiSchema['PeriodOut'];
    status: 'CURRENT' | 'STALE';
    source: 'ai' | 'fallback';
    summary: ApiSchema['SummaryBody'];
    notice?: string;
    createdAt: string;
    updatedAt: string;
  };
  SummaryResponse: { summary: ApiSchema['SummaryOut']; reused?: boolean };
  SynthesisRequest: {
    conversationId?: string | null;
    messageId?: string | null;
    text?: string | null;
  };
  SynthesizeRequest: { text: string };
  TableRow: { setup: Record<string, string>; length: number };
  TalkOut: {
    id: string;
    mode: string;
    category: string;
    topic: ApiSchema['TopicOut'];
    status: string;
    pendingMove: string;
    time: ApiSchema['TimeOut'];
    turns: Array<ApiSchema['TurnOut']>;
    story: ApiSchema['app__schemas__talk__StoryOut'] | null;
  };
  TalkStartRequest: {
    mode?: 'topic' | 'diary' | null;
    category?: string | null;
    topicId?: string | null;
    customCategoryId?: string | null;
    customTopic?: ApiSchema['CustomTopicIn'] | null;
    sharedItemId?: string | null;
  };
  TalkSummary: {
    id: string;
    mode: string;
    category: string;
    title: string;
    status: string;
    activeSeconds: number;
    storyId: string | null;
    startedAt: string;
  };
  TeachRequest: {
    beliefId:
      'brightness_longer' | 'light_higher_longer' | 'light_irrelevant' | 'distance_irrelevant';
    message?: string;
    cards?: Array<ApiSchema['ExperimentIn']>;
    attempt: number;
    inputOrigin?: 'example' | 'adult' | 'child';
  };
  TeachResponse: {
    ai: boolean;
    error?: string | null;
    source: 'ai' | 'fallback';
    claim: ApiSchema['ClaimOut'] | null;
    usesEvidence: boolean;
    convinced: boolean;
    missing: 'evidence' | 'fairness' | 'variable' | 'direction' | null;
    helpLevel: 'probe' | 'hint' | 'explanation' | null;
    friendReply: string;
  };
  TechPanelResponse: {
    aiEnabled: boolean;
    model: string;
    callCount: number;
    avgLatencyMs: number;
    calls: Array<ApiSchema['CallLogEntry']>;
    blocks: Array<ApiSchema['BlockLogEntry']>;
  };
  ThemeOut: {
    weekday: number;
    weekdayLabel: string;
    category: string;
    title: string;
    color: string;
    mood: string;
    visual: string;
  };
  ThoughtJourney: {
    initialIdea: string;
    evidence: Array<string>;
    alternatives: Array<string>;
    finalReflection: string;
  };
  ThoughtJourneyPatch: {
    initialIdea?: string | null;
    evidence?: Array<string> | null;
    alternatives?: Array<string> | null;
    finalReflection?: string | null;
  };
  TimeOut: {
    activeSeconds: number;
    minSeconds: number;
    remainingSeconds: number;
    canFinish: boolean;
  };
  TimelinePoint: {
    date: string;
    conversations: number;
    completedStories: number;
    responses: number;
  };
  TodayResponse: {
    theme: ApiSchema['ThemeOut'];
    suggestions: Array<ApiSchema['TopicOut']>;
    categories: Array<ApiSchema['CategoryOut']>;
  };
  TokenResponse: {
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string | null;
    refreshExpiresIn?: number;
    user: ApiSchema['AuthUser'];
  };
  TopicCategoryCreateRequest: { name: string; order?: number | null };
  TopicCategoryList: { items: Array<ApiSchema['TopicCategoryOut']>; nextCursor?: string | null };
  TopicCategoryOut: {
    id: string;
    name: string;
    kind: 'DEFAULT' | 'USER';
    order: number;
    visual: string;
    editable: boolean;
  };
  TopicCategoryResponse: { category: ApiSchema['TopicCategoryOut'] };
  TopicCategoryUpdateRequest: { name?: string | null; order?: number | null };
  TopicCreateRequest: {
    title: string;
    category?:
      | 'SCIENCE'
      | 'MATH'
      | 'HISTORY'
      | 'THINKING'
      | 'DAILY_LIFE'
      | 'NATURE'
      | 'FEELINGS'
      | 'IMAGINATION';
  };
  TopicCreateResponse: { topic: ApiSchema['CreatedTopic']; safety: ApiSchema['TopicSafety'] };
  TopicDetail: {
    id: string;
    title: string;
    category: string;
    source: 'BANK' | 'USER';
    hook: string;
    estimatedMinutes: number;
    questions: Array<string>;
  };
  TopicDetailResponse: { topic: ApiSchema['TopicDetail'] };
  TopicItem: {
    id: string;
    title: string;
    category: string;
    source: 'BANK' | 'USER';
    hook: string;
    estimatedMinutes: number;
  };
  TopicList: { items: Array<ApiSchema['TopicItem']>; nextCursor: string | null };
  TopicOut: {
    id: string | null;
    category: string;
    title: string;
    hook: string;
    visual: string;
    source: string;
  };
  TopicRef: { id: string | null; title: string; category: string };
  TopicSafety: { allowed: boolean; reason: string | null };
  TopicScheduleCreateRequest: {
    topicId: string;
    startsOn: string;
    endsOn: string;
    weekday?: number | null;
    order?: number;
    reason: string;
  };
  TopicScheduleList: { items: Array<ApiSchema['TopicScheduleOut']>; nextCursor: string | null };
  TopicScheduleOut: {
    id: string;
    topicId: string;
    topicTitle: string;
    category: string;
    weekday: number | null;
    startsOn: string;
    endsOn: string;
    order: number;
    reason: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  TopicScheduleResponse: { schedule: ApiSchema['TopicScheduleOut'] };
  TopicScheduleUpdateRequest: {
    startsOn?: string | null;
    endsOn?: string | null;
    weekday?: number | null;
    order?: number | null;
    reason?: string | null;
    clearWeekday?: boolean;
  };
  TopicSuggestions: { ai: boolean; error?: string | null; topics: Array<ApiSchema['TopicOut']> };
  TranscriptResponse: { text: string; confidence: number; durationMs?: number | null };
  TranscriptionResponse: { text: string };
  TurnOut: {
    id: string;
    seq: number;
    role: 'friend' | 'child';
    move: string;
    text: string;
    question?: string | null;
    sentenceOk: boolean | null;
    inputMode: string;
    visual: string | null;
    words: Array<ApiSchema['WordNote']>;
    source: string | null;
    createdAt: string;
  };
  TurnRequest: { text: string; inputMode?: 'text' | 'voice' };
  TurnResponse: {
    ai: boolean;
    error?: string | null;
    accepted: boolean;
    safety?: string | null;
    move: string;
    childTurn: ApiSchema['TurnOut'];
    friendTurn: ApiSchema['TurnOut'];
    sentenceStarters: Array<string>;
    time: ApiSchema['TimeOut'];
    story?: ApiSchema['app__schemas__talk__StoryOut'] | null;
  };
  UnlinkResponse: { ok?: boolean; linkId: string; dataDeleted?: boolean; message?: string };
  ValidationError: {
    loc: Array<string | number>;
    msg: string;
    type: string;
    input?: unknown;
    ctx?: Record<string, unknown>;
  };
  VariableOut: {
    id: 'lightHeight' | 'stickHeight' | 'distance' | 'brightness';
    name: string;
    up: string;
    levels: Array<ApiSchema['LevelOut']>;
  };
  WeeklyActivity: { conversationDays: number; completedStories: number };
  WeeklyScore: { week: string; observe: number; reason: number; express: number };
  WordIn: { word: string; meaning: string; example?: string; talkId?: string | null };
  WordNote: { word: string; meaning: string; example?: string };
  WordOut: {
    id: string;
    word: string;
    meaning: string;
    example: string;
    quizSeen: number;
    quizCorrect: number;
    learned: boolean;
    createdAt: string;
  };
  WordQuizOut: {
    id: string;
    mode: 'MEANING_TO_WORD' | 'WORD_TO_MEANING' | 'FILL_IN_BLANK';
    status: 'IN_PROGRESS' | 'COMPLETED';
    questionCount: number;
    answeredCount: number;
    questions: Array<ApiSchema['app__v1__library_schemas__QuizQuestionOut']>;
    createdAt: string;
    completedAt: string | null;
  };
  WordUsed: {
    id: string;
    word: string;
    meaning: string;
    status: 'NEW' | 'PRACTICING' | 'FAMILIAR';
  };
  WordbookCreateRequest: { word: string; conversationId?: string | null; messageId: string };
  WordbookEntryOut: {
    id: string;
    word: string;
    reading: string;
    meaning: string;
    example: string;
    mySentence: string | null;
    status: 'NEW' | 'PRACTICING' | 'FAMILIAR';
    source: ApiSchema['WordbookSource'];
    meaningSource: 'ai' | 'fallback';
    sourceSentence: string;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  WordbookEntryResponse: { entry: ApiSchema['WordbookEntryOut'] };
  WordbookList: {
    summary: ApiSchema['WordbookSummary'];
    items: Array<ApiSchema['WordbookEntryOut']>;
    nextCursor: string | null;
  };
  WordbookPatchRequest: {
    status?: 'NEW' | 'PRACTICING' | 'FAMILIAR' | null;
    mySentence?: string | null;
  };
  WordbookSource: { conversationId: string | null; messageId: string | null };
  WordbookSummary: {
    total: number;
    familiar: number;
    practicing: number;
    newThisWeek: number;
    new: number;
    dueForReview: number;
  };
  WordsProgressOut: { saved: number; learned: number };
  app__schemas__family__SafetyEventOut: {
    category: string;
    escalate: boolean;
    talkId: string | null;
    createdAt: string;
  };
  app__schemas__library__AnswerOut: {
    index: number;
    chosen: number;
    correct: boolean;
    word: string;
  };
  app__schemas__library__ConsultationOut: {
    id: string;
    source: string;
    summary: Record<string, unknown>;
    createdAt: string;
  };
  app__schemas__library__QuizCreateRequest: { count?: number; wordIds?: Array<string> | null };
  app__schemas__library__QuizQuestionOut: {
    index: number;
    wordId: string;
    prompt: string;
    options: Array<string>;
  };
  app__schemas__talk__StoryOut: {
    id: string;
    talkId: string;
    title: string;
    scenes: Array<ApiSchema['StorySceneOut']>;
    endingQuestion: string;
    source: string;
    createdAt: string;
  };
  app__v1__library_schemas__QuizCreateRequest: {
    count?: number | null;
    mode?: 'MEANING_TO_WORD' | 'WORD_TO_MEANING' | 'FILL_IN_BLANK';
    status?: 'NEW' | 'PRACTICING' | 'FAMILIAR' | null;
  };
  app__v1__library_schemas__QuizQuestionOut: {
    id: string;
    index: number;
    prompt: string;
    options: Array<ApiSchema['QuizOption']>;
    answered: boolean;
  };
  app__v1__report_schemas__ConsultationOut: {
    id: string;
    profileId: string;
    period: string;
    source: 'ai' | 'fallback';
    consultation: ApiSchema['ConsultationBody'];
    questions?: Array<ApiSchema['ConsultationQuestionOut']>;
    notice?: string;
    createdAt: string;
  };
  app__v1__schemas_accounts__ProfileOut: {
    id: string;
    nickname: string;
    schoolOrGroup?: string | null;
    gradeOrAgeBand?: string | null;
    interests?: Array<string>;
    interestDetails?: Array<string>;
    growthGoal?: string | null;
    summary?: string;
    version: number;
    role: 'OWNER' | 'GUARDIAN';
    permissions: Array<string>;
    isDefault: boolean;
    needsFirstGreeting: boolean;
    createdAt: string;
    updatedAt: string;
  };
  app__v1__schemas_conversation__AnswerOut: {
    type: 'TEXT' | 'SINGLE_CHOICE';
    optionId?: string | null;
  };
  app__v1__schemas_conversation__ProfileOut: {
    id: string;
    nickname: string;
    schoolOrGroup: string | null;
    gradeOrAgeBand: string | null;
    interests: Array<string>;
    interestDetails: Array<string>;
    growthGoal: string | null;
  };
  app__v1__schemas_conversation__StoryOut: {
    id: string;
    title: string;
    summary: string;
    body: string;
    thoughtJourney: ApiSchema['ThoughtJourney'];
    category: string;
    topic: ApiSchema['TopicRef'];
    favorite: boolean;
    version: number;
    sourceConversationId: string;
    createdAt: string;
    updatedAt: string;
  };
  app__v1__social_schemas__SafetyEventOut: {
    id: string;
    category: string;
    needsAttention: boolean;
    guidance: string;
    occurredAt: string;
  };
}
export type Model<K extends keyof ApiSchema> = ApiSchema[K];
