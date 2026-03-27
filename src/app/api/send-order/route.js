import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, name, items, total, cycleName, orderId, date } = await request.json();

    const itemsHtml = items.map(it =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${it.product_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:center">${it.quantity} ${it.product_unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right">$${it.subtotal.toLocaleString("es-CL")}</td>
      </tr>`
    ).join("");

    const html = `
    <div style="max-width:520px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#faf9f6;padding:32px 24px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:40px">🌾</span>
        <h1 style="font-size:22px;color:#1b4332;margin:8px 0 0">Cooperativa Origen</h1>
        <p style="font-size:13px;color:#888;margin:4px 0 0">Comprobante de Pedido</p>
      </div>
      <div style="background:#ffffff;border-radius:10px;padding:24px;border:1px solid #eee">
        <p style="font-size:15px;color:#333;margin:0 0 4px">¡Hola ${name}!</p>
        <p style="font-size:14px;color:#666;margin:0 0 20px">Tu pedido ha sido confirmado correctamente.</p>
        <div style="background:#f0f4f8;border-radius:8px;padding:12px;margin-bottom:16px">
          <p style="margin:0;font-size:13px;color:#555"><strong>Pedido:</strong> ${orderId}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555"><strong>Ciclo:</strong> ${cycleName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555"><strong>Fecha:</strong> ${date}</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#2d6a4f">
              <th style="padding:10px 12px;text-align:left;color:#fff;font-size:13px;border-radius:6px 0 0 0">Producto</th>
              <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px">Cantidad</th>
              <th style="padding:10px 12px;text-align:right;color:#fff;font-size:13px;border-radius:0 6px 0 0">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:16px;padding:14px;background:#2d6a4f;border-radius:8px;text-align:center">
          <span style="color:#fff;font-size:18px;font-weight:700">Total: $${total.toLocaleString("es-CL")}</span>
        </div>
        <p style="font-size:13px;color:#888;margin:16px 0 0">Te notificaremos cuando tu pedido esté listo para retiro. Puedes ver tu historial completo en la plataforma.</p>
      </div>
      <div style="text-align:center;margin-top:20px">
        <p style="font-size:12px;color:#aaa;margin:0">Cooperativa de Consumo y Agrícola</p>
        <p style="font-size:12px;color:#aaa;margin:2px 0">Trabajadores de Fundación Educacional Origen — Pirque</p>
      </div>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Cooperativa Origen <pedidos@granjaorigen.cl>",
        to: email,
        subject: `✅ Pedido confirmado — ${cycleName}`,
        html: html,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
