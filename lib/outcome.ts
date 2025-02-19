type Issue = {
  severity: "fatal" | "error" | "warning" | "information" | "success";
  code: string;
  details: {
    text: string;
    coding: Record<string, unknown>[];
  };
  expression: string[];
};
export class OperationOutcome extends Error {
  readonly resourceType: "OperationOutcome" = "OperationOutcome" as const;
  issue: Issue[];

  constructor(issue: Issue[]) {
    super();
    this.issue = issue;
  }
}
