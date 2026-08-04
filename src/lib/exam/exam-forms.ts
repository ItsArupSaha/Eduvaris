/**
 * Exam form registry — resolves an attempt's examId + module to its content.
 *
 * Both Reading and Listening register their active forms here. The store and
 * the submit route both call `getExamForm` to resolve content for grading +
 * display. Old attempts grade against their own version's key — a content
 * bump ships a new id (e.g. reading-v2) so historical attempts stay
 * reproducible.
 *
 * Shared between client (store hydration) and server (submit grader). Server
 * usage is read-only + pure, so the bundle cost is fine.
 */
import type { ExamForm } from "./content-types";
import type { ModuleKey } from "@/lib/firebase/user-types";
import { READING_V1 } from "./reading/reading-v1";
import { LISTENING_V1 } from "./listening/listening-v1";

/** All registered forms keyed by id. */
const FORMS: Record<string, ExamForm> = {
  [READING_V1.id]: READING_V1,
  [LISTENING_V1.id]: LISTENING_V1,
};

/**
 * Look up an exam form by id. Module is provided for a defensive cross-check
 * (the form's module must match what the attempt claims).
 */
export function getExamForm(examId: string, module?: ModuleKey): ExamForm | undefined {
  const form = FORMS[examId];
  if (!form) return undefined;
  if (module && form.module !== module) return undefined;
  return form;
}

/** The active form for a module — used by the start route. */
export function activeFormFor(module: ModuleKey): ExamForm | undefined {
  // First matching form for the module. v1-only for now.
  return Object.values(FORMS).find((f) => f.module === module);
}
