export const prerender = false;

import type { APIRoute } from "astro";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  // Cloudflare Pages runtime provides env via locals.runtime.env
  // In astro dev, fall back to process.env (loaded from .dev.vars isn't automatic,
  // but .env works, or we can read it manually)
  const runtime = (locals as any).runtime;
  const apiKey: string | undefined =
    runtime?.env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid form data." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Honeypot — silently accept if filled (bots won't know it failed)
  const honeypot = formData.get("website") as string | null;
  if (honeypot) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const name = (formData.get("name") as string || "").trim();
  const email = (formData.get("email") as string || "").trim();
  const message = (formData.get("message") as string || "").trim();

  // Validation
  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (name.length > 200) errors.push("Name is too long.");
  if (!email) errors.push("Email is required.");
  if (email.length > 254) errors.push("Email is too long.");
  if (email && !EMAIL_REGEX.test(email)) errors.push("Invalid email address.");
  if (!message) errors.push("Message is required.");
  if (message.length > 5000) errors.push("Message is too long.");

  if (errors.length > 0) {
    return new Response(
      JSON.stringify({ error: errors.join(" ") }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const htmlBody = `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Email:</strong> ${safeEmail}</p>
<hr>
<p>${safeMessage.replace(/\n/g, "<br>")}</p>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@zacharylincoln.com",
        to: "contact@zacharylincoln.com",
        reply_to: email,
        subject: `Contact Form: ${name}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend API error:", res.status, body);
      return new Response(
        JSON.stringify({ error: "Failed to send message. Please try again." }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Resend fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
};
