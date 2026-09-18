/**
 * main 의 묶음 모듈. 보호자·설정 화면 본문은 API v1 판(ParentScreen·ReportScreen)에 있다.
 * ProtectedParentScreen 은 GuardianProvider 를 씌우는 라우트 껍데기다.
 */
export {
  ProtectedParentScreen,
  ProfileScreen as ServerProfile,
  DataScreen as ServerData,
  TechScreen as ServerTech,
} from './ParentScreen';
export { ReportScreen as ServerReport } from './ReportScreen';
