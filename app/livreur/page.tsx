import { redirect } from "next/navigation";
import { getHomePath } from "@/lib/permissions";

export default function LivreurHomePage() {
  redirect(getHomePath("livreur"));
}
