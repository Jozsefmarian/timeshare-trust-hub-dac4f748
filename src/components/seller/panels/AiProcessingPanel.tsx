import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, Loader2 } from "lucide-react";

export default function AiProcessingPanel() {
  return (
    <Card className="shadow-sm border-secondary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-secondary" />
          AI feldolgozás folyamatban
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <Loader2 className="h-5 w-5 text-secondary animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Az Ön ügyét jelenleg automatikusan feldolgozzuk.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A feldolgozás általában néhány percet vesz igénybe. Az eredményről értesítést kap.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
