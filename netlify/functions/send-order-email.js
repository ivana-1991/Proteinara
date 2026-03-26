const { Resend } = require('resend');
const { Client } = require('@notionhq/client');

const resend = new Resend(process.env.RESEND_API_KEY);
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const NOTION_DB = '444505edfc6b42b88e0183fe14cfa9c8';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  try {
    const { name, email, phone, city, address, note, items, total, discountedTotal, discount } = JSON.parse(event.body);

    const oatQty     = items.find(i => i.name === 'Oat Fuel')?.quantity || 0;
    const brownieQty = items.find(i => i.name === 'Brownie Fuel')?.quantity || 0;
    const bananaQty  = items.find(i => i.name === 'Banana Fuel')?.quantity || 0;
    const itemLines  = items.map(i => `  ${i.name} x${i.quantity} = €${i.price * i.quantity}`).join('\n');

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

    // Send email + log to Notion in parallel
    await Promise.all([
      resend.emails.send({
        from: 'Proteinara Orders <onboarding@resend.dev>',
        to: 'ivana@navai.io',
        subject: `🍞 New Order from ${name} — €${discountedTotal}`,
        text: ownerText,
      }),
      notion.pages.create({
        parent: { database_id: NOTION_DB },
        properties: {
          'Customer':    { title: [{ text: { content: name } }] },
          'Email':       { email: email },
          'Phone':       { phone_number: phone },
          'City':        { rich_text: [{ text: { content: city } }] },
          'Address':     { rich_text: [{ text: { content: address } }] },
          'Oat Fuel':    { number: oatQty },
          'Brownie Fuel':{ number: brownieQty },
          'Banana Fuel': { number: bananaQty },
          'Total (€)':   { number: parseFloat(discountedTotal) },
          'Date':        { date: { start: new Date().toISOString().split('T')[0] } },
          'Note':        { rich_text: [{ text: { content: note || '' } }] },
        },
      }),
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Order processing error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
