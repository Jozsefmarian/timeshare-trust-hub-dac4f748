import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SellerSupport() {
  return (
    <SellerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Segítségre van szüksége?</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kapcsolat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ha az ügye feldolgozásával kapcsolatban kérdése van, vagy elakadt valamelyik lépésnél, lépjen kapcsolatba
              ügyfélszolgálatunkkal.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:support@tsrmegoldasok.hu" className="text-primary hover:underline">
                support@tsrmegoldasok.hu
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <a href="tel:+3612345678" className="text-primary hover:underline">
                +36 70 561 8110
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button variant="outline" asChild className="w-full justify-between">
              <Link to="/seller/cases">
                Ügyeim
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
