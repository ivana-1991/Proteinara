const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  try {
    const { name, email, phone, city, address, note, items, total, discountedTotal, discount } = JSON.parse(event.body);

    const itemLines = items.map(i => `  ${i.name} x${i.quantity} = €${i.price * i.quantity}`).join('\n');

    const ownerText = [
      `NEW ORDER — Proteinara`,
      `─────────────────────`,
      `Customer: ${name}`,
      `Email:    ${email}`,
      `Phone:    ${phone}`,
      `Address:  ${address}, ${city}`,
      note ? `Note:     ${note}` : '',
      ``,
      `Items:`,
      itemLines,
      ``,
      discount > 0 ? `Subtotal: €${total}` : '',
      discount > 0 ? `Discount: ${discount}% (Catch the Bread game)` : '',
      `Total: €${discountedTotal}`,
      ``,
      `✅ PAID via Stripe`,
    ].filter(l => l !== undefined).join('\n');

    await resend.emails.send({
      from: 'Proteinara Orders <onboarding@resend.dev>',
      to: 'ivana@navai.io',
      subject: `🍞 New Order from ${name} — €${discountedTotal}`,
      text: ownerText,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
