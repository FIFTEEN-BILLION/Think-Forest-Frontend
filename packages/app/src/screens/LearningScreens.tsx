/**
 * main 의 묶음 모듈. 대화·첫인사·모험 화면 본문은 API v1 판에 있다.
 * main 라우터가 쓰던 Server* 이름을 그대로 유지한다.
 */
export { ConversationScreen as ServerTalk } from './ConversationScreen';
export { FirstTalkScreen as ServerFirstTalk } from './FirstTalkScreen';
export { AdventureScreen as ServerAdventures } from './AdventureScreen';
export { SessionScreen as ServerActivity } from './SessionScreen';
