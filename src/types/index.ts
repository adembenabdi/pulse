// Types for the Pulse app

// ── User ──────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  university: string;
  field: string;
  year: number;
  clubs: string[];
  hasJob: boolean;
  jobTitle?: string;
  city: string;
  timetableUrl?: string;
  interests: string[];
  modules: UserModules;
  createdAt: string;
}

export interface UserModules {
  prayer: boolean;
  sport: boolean;
  food: boolean;
  learning: boolean;
}

// ── Prayer ────────────────────────────────
export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface PrayerLog {
  id: string;
  date: string;
  prayer: keyof PrayerTimes;
  completed: boolean;
  onTime: boolean;
  time: string;
}

// ── Sport ─────────────────────────────────
export type ExerciseType = 'pushups' | 'pullups' | 'squats' | 'abs';

export interface ExerciseSet {
  type: ExerciseType;
  target: number;
  completed: number;
  done: boolean;
}

export interface SportLog {
  id: string;
  date: string;
  exercises: ExerciseSet[];
  isFriday: boolean;
  fridayRun?: {
    distance: number; // km
    completed: boolean;
    afterFajr: boolean;
  };
  completedAt?: string;
}

// ── Food ──────────────────────────────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  ingredients: string[];
  prepTime: number; // minutes
  prepared: boolean;
}

export interface DayMealPlan {
  id: string;
  date: string;
  meals: Meal[];
  preparedMorning: boolean;
  notes: string;
}

export interface WeeklyMealProgram {
  id: string;
  weekStart: string;
  days: { [day: string]: Meal[] };
}

// ── Learning ──────────────────────────────
export interface LearningEntry {
  id: string;
  date: string;
  topic: string;
  category: 'field' | 'world' | 'tech' | 'other';
  duration: number; // minutes
  summary: string;
  links: string[];
  completed: boolean;
}

// ── Work ──────────────────────────────────
export type WorkCategory = 'development' | 'startup' | 'job';

export interface WorkTask {
  id: string;
  category: WorkCategory;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WorkProject {
  id: string;
  category: WorkCategory;
  name: string;
  description: string;
  tasks: string[]; // task IDs
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

// ── Study ─────────────────────────────────
export interface Course {
  id: string;
  name: string;
  code: string;
  professor: string;
  room: string;
  color: string;
  day: number; // 0-6
  startTime: string; // "HH:mm"
  endTime: string;
  type: 'lecture' | 'td' | 'tp' | 'exam';
  sourceId?: string | null; // non-null = synced from timetable
}

export interface StudySession {
  id: string;
  courseId: string;
  courseName?: string;
  courseColor?: string;
  date: string;
  duration: number;
  topic: string;
  notes: string;
  completed: boolean;
}

// ── Finance ───────────────────────────────
export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = 'food' | 'transport' | 'education' | 'entertainment' | 'health' | 'clothing' | 'other';
export type IncomeCategory = 'work' | 'family' | 'freelance' | 'gift' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: ExpenseCategory | IncomeCategory;
  description: string;
  date: string;
  recurring?: boolean;
}

// ── Tasks ─────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'personal' | 'study' | 'work' | 'club' | 'other';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Habits ────────────────────────────────
export interface Habit {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

// ── Journal ───────────────────────────────
export interface JournalEntry {
  id: string;
  date: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  energy?: number; // 1-5
  title?: string;
  content: string;
  tags: string[];
}

// ── Goals ─────────────────────────────────
export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'study' | 'career' | 'health' | 'personal' | 'financial' | 'spiritual';
  deadline?: string;
  progress: number; // 0-100
  status: 'active' | 'completed';
  milestones: Milestone[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

// ── Routine (daily overview) ──────────────
export interface DailyRoutine {
  date: string;
  prayers: PrayerLog[];
  sport?: SportLog;
  meals?: DayMealPlan;
  learning?: LearningEntry;
  studySessions: StudySession[];
  tasks: Task[];
  workTasks: WorkTask[];
}
