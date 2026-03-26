const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, discount, name, email } = JSON.parse(event.body);

    // Calculate total in cents
    let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (discount > 0) total = total * (1 - discount / 100);
    const amount = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        customer_name: name,
        items: items.map(i => `${i.name} x${i.quantity}`).join(', '),
        discount: discount > 0 ? `${discount}%` : 'none',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
