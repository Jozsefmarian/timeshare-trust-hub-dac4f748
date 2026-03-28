import { useEffect, useState } from "react";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SellerProfile() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [birthName, setBirthName] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [motherName, setMotherName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const [{ data: p }, { data: sp }] = await Promise.all([
          supabase.from("profiles").select("full_name, email, phone").eq("id", profile.id).maybeSingle(),
          supabase.from("seller_profiles").select("billing_name, billing_address, birth_name, birth_place, birth_date, mother_name, id_number, tax_id").eq("user_id", profile.id).maybeSingle(),
        ]);
        if (p) {
          setFullName(p.full_name ?? "");
          setPhone(p.phone ?? "");
        }
        if (sp) {
          setBillingName(sp.billing_name ?? "");
          setBillingAddress(sp.billing_address ?? "");
          setBirthName(sp.birth_name ?? "");
          setBirthPlace(sp.birth_place ?? "");
          setBirthDate(sp.birth_date ?? "");
          setMotherName(sp.mother_name ?? "");
          setIdNumber(sp.id_number ?? "");
          setTaxId(sp.tax_id ?? "");
        }
      } catch (e) {
        console.error(e);
        toast.error("Nem sikerült betölteni a profil adatokat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName || null, phone: phone || null })
        .eq("id", profile.id);
      if (profileErr) throw profileErr;

      const { error: spErr } = await supabase
        .from("seller_profiles")
        .upsert(
          {
            user_id: profile.id,
            billing_name: billingName || null,
            billing_address: billingAddress || null,
            birth_name: birthName || null,
            birth_place: birthPlace || null,
            birth_date: birthDate || null,
            mother_name: motherName || null,
            id_number: idNumber || null,
            tax_id: taxId || null,
          },
          { onConflict: "user_id" }
        );
      if (spErr) throw spErr;

      toast.success("Profil adatok sikeresen mentve.");
    } catch (e: any) {
      console.error(e);
      toast.error("Hiba történt a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Profil</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kapcsolattartási adatok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>E-mail cím</Label>
              <Input value={profile?.email ?? ""} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Teljes név</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Telefonszám</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Személyes adatok (szerződéshez)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Számlázási név</Label>
              <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} />
            </div>
            <div>
              <Label>Lakcím</Label>
              <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
            </div>
            <div>
              <Label>Születési név</Label>
              <Input value={birthName} onChange={(e) => setBirthName(e.target.value)} />
            </div>
            <div>
              <Label>Születési hely</Label>
              <Input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
            </div>
            <div>
              <Label>Születési dátum</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <Label>Anyja neve</Label>
              <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} />
            </div>
            <div>
              <Label>Személyi igazolvány száma</Label>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </div>
            <div>
              <Label>Adóazonosító jel</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Mentés...</> : "Adatok mentése"}
        </Button>
      </div>
    </SellerLayout>
  );
}
