export interface Slide {
  id: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
  keyPoints: string[];
  topic: string;
  densityScore: number; // 1 (light) to 5 (dense math/diagram)
  diagramType?: 'flowchart' | 'cycle' | 'table' | 'equation' | 'architecture';
  diagramData?: any;
  externalCitations?: string[];
  pageImageUrl?: string; // High-res rendered PDF canvas or slide image
}

export interface Lecture {
  id: string;
  title: string;
  subject: string;
  authorOrCourse: string;
  totalPages: number;
  slides: Slide[];
  createdAt: string;
  lastStudiedAt: string;
  baselineSecsPerPage: number;
  currentPage: number;
  totalStudySeconds: number;
  focusPoints: number;
  sharedByParent?: boolean; // true if this was sent by a parent
  parentSenderName?: string;
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
  points: AnnotationPoint[];
}

export type PageAnnotationsMap = Record<number, AnnotationStroke[]>;

export interface QuestionAnalysis {
  covered: string[];
  missing: string[];
  incorrect: string[];
  feedback: string;
}

export interface UnderstandingTurn {
  question: string;
  studentAnswer: string;
  analysis?: QuestionAnalysis;
}

export interface InlineCorrection {
  original: string;
  correction: string;
  explanation: string;
}

export interface CompiledSummary {
  studentWordsSummary: string;
  inlineCorrections: InlineCorrection[];
  lectureTakeaways: string[];
  corrections?: string[];
  strengths?: string[];
}

export interface GapQuizQuestion {
  id: string;
  concept: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  studentAnswer?: string;
  isCorrect?: boolean;
}

export interface ConceptMastery {
  concept: string;
  status: 'mastered' | 'developing' | 'needs_review';
  score: number; // 0 to 100
  note: string;
}

export interface SpacedRepetitionItem {
  id: string;
  concept: string;
  lectureTitle: string;
  daysUntilReview: number;
  lastReviewed: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface WrapUpReport {
  lectureId: string;
  lectureTitle: string;
  studyTimeMinutes: number;
  focusEfficiencyPercentage: number;
  totalGapsIdentified: number;
  gapsResolvedInQuiz: number;
  conceptMap: ConceptMastery[];
  primaryRecommendation: string;
  spacedRepetitionQueue: SpacedRepetitionItem[];
  studentFinalSummary: string;
}

export interface StuckDetectionState {
  pageNumber: number;
  timeSpentSeconds: number;
  expectedSeconds: number;
  level: 1 | 2 | 3;
  isActivelyEngaging: boolean;
  interventionActive: boolean;
  declinedPages: Set<number>;
  specialistOffered: 'quiz' | 'understanding' | 'summary';
}

export type AttentionStateKind = 'focused' | 'using_phone' | 'sleeping' | 'distracted' | 'away';

export interface AttentionTrackingState {
  cameraActive: boolean;
  cameraConsentGiven: boolean;
  cameraConsentModalOpen: boolean;
  attentionDrifted: boolean;
  driftSeconds: number;
  visualPulseActive: boolean;
  gentleToneModalOpen: boolean;
  gentleToneCount: number;
  detectedState: AttentionStateKind;
  detectionReason?: string;
  phoneAlertOpen: boolean;
  sleepingAlertOpen: boolean;
  awayAlertOpen: boolean;
  isAnalyzingFrame: boolean;
  lastScanTimestamp?: number;
  tabSwitchToast: {
    show: boolean;
    timestamp: number;
    message?: string;
  } | null;
}

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

export interface PomodoroState {
  mode: PomodoroMode;
  secondsRemaining: number;
  isRunning: boolean;
  pomodorosCompleted: number;
}

export interface AnnotationColorOption {
  id: string;
  name: string;
  meaning: string;
  color: string;
  dotColor: string;
}

export const PEN_COLOR_OPTIONS: AnnotationColorOption[] = [
  { id: 'black', name: 'Key Pen', meaning: 'Core facts & key definitions', color: '#000000', dotColor: '#000000' },
  { id: 'green', name: 'Understood', meaning: 'Mastered concepts', color: '#10B981', dotColor: '#10B981' },
  { id: 'blue', name: 'Exam Revision', meaning: 'Points to quiz before tests', color: '#3B82F6', dotColor: '#3B82F6' },
  { id: 'red', name: 'Needs Review', meaning: 'Unclear sections to revisit with coach', color: '#EF4444', dotColor: '#EF4444' },
];

export const MARKER_COLOR_OPTIONS: AnnotationColorOption[] = [
  { id: 'yellow-marker', name: 'Key Highlight', meaning: 'Key Highlight', color: '#FACC15', dotColor: '#FACC15' },
  { id: 'green-marker', name: 'Understood', meaning: 'Understood', color: '#10B981', dotColor: '#10B981' },
  { id: 'blue-marker', name: 'Exam Revision', meaning: 'Exam Revision', color: '#3B82F6', dotColor: '#3B82F6' },
  { id: 'red-marker', name: 'Needs Review', meaning: 'Needs Review', color: '#EF4444', dotColor: '#EF4444' },
];

// ─── Parent Account System Types ──────────────────────────────────────────────

export type AccountType = 'student' | 'parent';

export interface ParentInvite {
  id: string;
  parentUid: string;
  parentName: string;
  parentEmail: string;
  childEmail: string;
  childUid?: string;
  status: 'pending' | 'accepted' | 'rejected';
  sentAt: string;
  respondedAt?: string;
}

export interface ChildPermissions {
  viewAchievements: boolean;
  sendSlides: boolean;
  autoAlerts: boolean; // agent-driven notifications
  studyLockSuggest: boolean; // can suggest focus mode
}

export interface LinkedChild {
  childUid: string;
  childName: string;
  childEmail: string;
  linkedAt: string;
  permissions: ChildPermissions;
  // Realtime data (fetched from child's Firestore doc)
  currentStreak?: number;
  focusPoints?: number;
  lastStudiedAt?: string;
  todayMinutes?: number;
  activeLectures?: number;
  selectedCharacter?: string;
}

export interface ParentAlertSettings {
  sessionStartAlert: boolean;
  streakLostAlert: boolean;
  dailyReportTime: string; // HH:MM 24h
  noStudyAlertTime: string; // HH:MM - if no session by this time
  achievementAlert: boolean;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  webPushEnabled: boolean;
}

export interface StudyLockRequest {
  id: string;
  parentUid: string;
  childUid: string;
  active: boolean;
  allowedApps: string[]; // app bundle IDs or names
  message: string; // message to show the student
  requestedAt: string;
  acknowledgedAt?: string;
}

export interface SharedContent {
  id: string;
  parentUid: string;
  parentName: string;
  childUid: string;
  type: 'pdf' | 'slides';
  title: string;
  fileUrl: string;
  sentAt: string;
  opened: boolean;
}
