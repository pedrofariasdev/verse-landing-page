const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e e-mail são obrigatórios." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Verse <contato@verseonline.pt>",
        to: [email],
        subject: "Sua vaga na Verse foi reservada 📚",
        html: `
          <div style="font-family: Arial, sans-serif; background:#f8f8f5; padding:40px;">
            <div style="max-width:600px; margin:0 auto; background:white; padding:40px; border-radius:24px;">
              
              <h1 style="color:#79B4A9; letter-spacing:4px; text-align:center;">VERSE</h1>
              
              <div style="width:120px; height:4px; background:#D4AF37; border-radius:999px; margin:10px auto 30px;"></div>

              <h2 style="color:#676F54;">Bem-vindo à Verse, ${name}!</h2>

              <p style="color:#333; line-height:1.7;">
                O seu lugar na lista de espera foi reservado com sucesso.
              </p>

              <p style="color:#333; line-height:1.7;">
                A Verse está sendo criada como uma rede social literária para conectar leitores,
                escritores e criadores através de histórias, ideias e criatividade.
              </p>

              <p style="color:#333; line-height:1.7;">
                Quando a versão beta estiver pronta, você receberá um convite por este e-mail.
              </p>

              <div style="margin:35px 0; padding:22px; background:#D7F2BA; border-radius:18px;">
                <p style="margin:0; color:#2b2b2b; line-height:1.6;">
                  Obrigado por acreditar na Verse desde o início. As melhores histórias começam com uma única página — e você está escrevendo a primeira conosco.
                </p>
              </div>

              <hr style="border:none; border-top:1px solid #d9e0cf; margin:30px 0;">

              <p style="color:#676F54; font-weight:bold; margin-bottom:10px;">
                - Equipe Verse
              </p>

              <p style="color:#8a927b; font-size:14px; line-height:1.6;">
                Rede social literária para leitores, escritores e criadores.
              </p>

              <p style="color:#8a927b; font-size:14px; line-height:1.6;">
                🌐 verseonline.pt<br>
                ✉️ contato@verseonline.pt
              </p>

              <p style="color:#a0a792; font-size:12px; margin-top:20px;">
                   Você está recebendo este e-mail porque se inscreveu na lista de espera da Verse.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro interno ao enviar e-mail.", details: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});