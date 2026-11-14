/** Typen der Erfassungs-API (Phase 5); siehe apps/server/src/routes/assessments.ts und answers.ts. */
import type { Answer, AssessmentStatus, MethodModel } from '@ai-tpi/shared';
import type { Role } from '@ai-tpi/shared';

export interface AssessmentSummary {
  id: string;
  project: string;
  assessorName: string;
  startDate: string;
  endDate: string | null;
  status: AssessmentStatus;
  methodModel: MethodModel;
  includeAi: boolean;
  createdAt: string;
}

export interface AssessmentMaster {
  project: string;
  assessorName: string;
  domain: string;
  organizationUnit: string;
  mainStakeholder: string;
  contact: string;
  assessmentType: string;
  startDate: string;
  endDate: string | null;
  interviewCount: number | null;
  scope: string;
  methodModel: MethodModel;
  includeAi: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  departmentId: string | null;
}

export interface Source {
  id: string;
  name: string;
  role: string;
  unit: string;
  type: 'person' | 'document' | 'tool' | 'other';
  active: boolean;
}

export interface AssessmentDetail extends AssessmentSummary, AssessmentMaster {
  catalogVersion: string;
  releasedAt: string | null;
  members: Member[];
  assignments: { keyAreaId: string; departmentId: string }[];
  departments: { id: string; name: string; active: boolean }[];
  submissions: { departmentId: string; submittedAt: string }[];
  sources: Source[];
  me: {
    departmentId: string | null;
    departmentName: string | null;
    isMember: boolean;
    canManage: boolean;
    canAnswer: boolean;
    canComment: boolean;
    canConsolidate: boolean;
  };
}

export interface DepartmentAnswer {
  departmentId: string;
  checkpointId: string;
  value: Answer;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CommentItem {
  id: string;
  checkpointId: string;
  text: string;
  createdAt: string;
  updatedAt: string | null;
  authorId: string;
  authorName: string;
  departmentId: string | null;
  departmentName: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceRole: string | null;
}

export interface ConsolidationItem {
  keyAreaId: string;
  checkpointId: string;
  departments: { departmentId: string; departmentName: string; value: Answer }[];
  suggestion: Answer;
  disagree: boolean;
  consolidated: {
    value: Answer;
    suggestedValue: string;
    rationale: string | null;
    version: number;
    consolidatedAt: string;
    consolidatedBy: string | null;
  } | null;
}

export const emptyMaster = (assessorName = ''): AssessmentMaster => ({
  project: '',
  assessorName,
  domain: '',
  organizationUnit: '',
  mainStakeholder: '',
  contact: '',
  assessmentType: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
  interviewCount: null,
  scope: '',
  methodModel: 'agile',
  includeAi: true,
});
