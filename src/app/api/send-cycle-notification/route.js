import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { cycleName, closeDate } = await req.json();

    const { data: members } = await supabase
      .from("members")
      .select("email, full_name")
      .eq("is_active", true)
      .eq("approval_status", "aprobado");

    if (!members || members.length === 0) {
      return Response.json({ error: "No hay cooperados aprobados" }, { status: 400 });
    }

    const closeDateFormatted = closeDate
      ? new Date(closeDate).toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Por definir";

    const results = [];
    for (const member of members) {
      try {
        await resend.emails.send({
          from: "Cooperativa Origen <pedidos@granjaorigen.cl>",
          to: member.email,
          subject: "Nuevo ciclo abierto: " + cycleName,
          html: "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f0'><div style='max-width:600px;margin:0 auto;padding:20px'><div style='background:#2d6a4f;border-radius:12px 12px 0 0;padding:24px;text-align:center;color:#fff'><h1 style='margin:0;font-size:22px'>Cooperativa Origen</h1><p style='margin:8px 0 0;opacity:0.8;font-size:14px'>Nuevo ciclo de pedidos</p></div><div style='background:#fff;padding:24px;border-radius:0 0 12px 12px'><p style='font-size:16px;color:#333'>Hola " + (member.full_name || "cooperado/a") + ",</p><div style='background:#f0faf4;border:2px solid #2d6a4f;border-radius:10px;padding:20px;margin:16px 0;text-align:center'><div style='font-size:12px;color:#2d6a4f;letter-spacing:1px;margin-bottom:4px'>CICLO ABIERTO</div><div style='font-size:20px;font-weight:700;color:#2d6a4f'>" + cycleName + "</div></div><div style='background:#fff3cd;border-radius:8px;padding:16px;margin:16px 0'><div style='font-size:13px;color:#856404'><strong>Cierre de pedidos:</strong><br>" + closeDateFormatted + "</div></div><p style='font-size:14px;color:#555;line-height:1.6'>Ya puedes ingresar a la plataforma para hacer tu pedido. Recuerda que los pedidos se cierran en la fecha indicada.</p><div style='text-align:center;margin:24px 0'><a href='https://cooperativa.granjaorigen.cl/catalogo' style='background:#2d6a4f;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block'>Hacer mi pedido</a></div><p style='font-size:12px;color:#999;text-align:center;margin-top:24px'>Cooperativa de Consumo - Fundacion Origen</p></div></div></body></html>",
        });
        results.push({ email: member.email, status: "sent" });
      } catch (e) {
        results.push({ email: member.email, status: "error", error: e.message });
      }
    }

    return Response.json({ sent: results.filter(r => r.status === "sent").length, total: members.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
