import { NextResponse } from "next/server";
import {
  submitPublicComplaint,
  type PublicComplaintType,
} from "@/lib/feedback/public-complaints";

const VALID_TYPES: PublicComplaintType[] = ["web_service", "web_order", "web_other"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = formData.get("type") as PublicComplaintType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Type de réclamation invalide" }, { status: 400 });
    }

    const photo = formData.get("photo");
    const photoFile =
      photo instanceof File && photo.size > 0 ? photo : null;

    const result = await submitPublicComplaint({
      type,
      customerName: String(formData.get("customerName") || ""),
      customerEmail: String(formData.get("customerEmail") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      message: String(formData.get("message") || ""),
      storeId: formData.get("storeId") ? String(formData.get("storeId")) : null,
      orderNumber: formData.get("orderNumber") ? String(formData.get("orderNumber")) : null,
      photo: photoFile,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error("[api/reclamation]", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
