/**
 * main 의 묶음 모듈. 화면 본문은 API v1 판(AdventureScreen·SessionScreen)에 있고
 * 여기서는 main 이 쓰던 이름만 그대로 이어 준다. 같은 화면을 두 벌 두지 않는다.
 */
export { AdventureScreen as ActivityCatalog } from './AdventureScreen';
export { SessionScreen as ApiActivity } from './SessionScreen';
