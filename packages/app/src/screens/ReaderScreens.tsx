/**
 * main 의 묶음 모듈. 홈·책장·단어·친구 이야기 화면 본문은 API v1 판에 있다.
 * main 라우터가 쓰던 Server* 이름을 그대로 유지한다.
 */
export { HomeScreen as ServerHome } from './HomeScreen';
export { LibraryScreen as ServerLibrary, RecordDetailScreen as ServerRecord } from './LibraryScreen';
export { CompleteScreen as ServerComplete } from './LibraryScreen';
export { CommunityScreen as ServerCommunity } from './CommunityScreen';
export { WordsScreen as ServerWords } from './WordsScreen';
export {
  CommunityStoryScreen as ServerCommunityStory,
  ShareStoryScreen as ServerShare,
  CustomTopicScreen as ServerTopics,
} from './ExperienceScreen';
