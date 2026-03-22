import { supabase } from "./client";

export type SubmitCaseResponse = {
  success: boolean;
  case_id: string;
  case_number: string;
  classification: "green" | "yellow" | "red";
  previous_status: string;
  new_status: "green_approved" | "yellow_review" | "red_rejected";
  submitted_at: string;
  uploaded_document_count: number;
};

export async function submitCase(caseId: string): Promise<SubmitCaseResponse> {
  if (!caseId) {
    throw new Error("A caseId kötelező.");
  }

  const { data, error } = await supabase.functions.invoke<SubmitCaseResponse>(
    "submit-case",
    {
      body: {
        case_id: caseId,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "A submit-case hívás sikertelen.");
  }

  if (!data?.success) {
    throw new Error("A submit-case nem adott vissza érvényes választ.");
  }

  return data;
}
