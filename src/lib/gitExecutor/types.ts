import type { GitState } from "../gitState";

export interface ExecutionResult {
  success: boolean;
  message: string;
  newState?: GitState;
}
