import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface UploadedDoc {
  id: string;
  original_file_name: string | null;
  upload_status: string;
  review_status: string;
  ai_status: string;
  uploaded_at: string | null;
  document_type_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
}

interface DocumentType {
  id: string;
  label: string;
}

function reviewBadge(s: string) {
  switch (s) {
    case "approved":
      return { label: "Jóváhagyva", className: "border-success/40 text-success" };
    case "rejected":
      return { label: "Elutasítva", className: "border-destructive/40 text-destructive" };
      function reviewBadge(s: string) {
        switch (s) {
          case "approved":
            return { label: "Jóváhagyva", className: "border-success/40 text-success" };
          case "rejected":
            return { label: "Elutasítva", className: "border-destructive/40 text-destructive" };
          default:
            return { label: "Ellenőrzés alatt", className: "border-muted-foreground/30 text-muted-foreground" };
        }
      }
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SubmittedDocumentsPanelProps {
  documents: UploadedDoc[];
  documentTypes: DocumentType[];
}

export default function SubmittedDocumentsPanel({ documents, documentTypes }: SubmittedDocumentsPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getTypeLabel = (id: string | null) => {
    if (!id) return "—";
    return documentTypes.find((t) => t.id === id)?.label || "Ismeretlen";
  };

  const handleOpen = async (doc: UploadedDoc) => {
    if (!doc.storage_bucket || !doc.storage_path) return;
    try {
      setLoadingId(doc.id);
      const { data, error } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoadingId(null);
    }
  };

  if (documents.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Beküldött dokumentumok
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => {
          const review = reviewBadge(doc.review_status);
          return (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.original_file_name || "Névtelen fájl"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getTypeLabel(doc.document_type_id)} • {formatDateTime(doc.uploaded_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${review.className}`}>
                  {review.label}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loadingId === doc.id || !doc.storage_path}
                  onClick={() => handleOpen(doc)}
                >
                  {loadingId === doc.id ? "..." : "Megnyitás"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
