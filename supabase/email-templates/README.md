# Feedlens.ai email templates

Drop-in templates for the Supabase Auth email types. Light + dark mode
aware, mobile-friendly, no remote assets, fewer than 50KB.

## Files

| File | Supabase template | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Confirm your Feedlens.ai account` |
| `reset-password.html` | Reset password | `Reset your Feedlens.ai password` |

## How to install

1. Open your Supabase project dashboard.
2. Navigate to **Authentication → Email templates**.
3. For each template above:
   - Set the **Subject** to the value in the table.
   - Replace the **Body (HTML)** with the file contents.
   - Save.

## Variables used

The templates rely only on the standard Supabase variables — no custom
data is required:

- `{{ .ConfirmationURL }}` — primary call-to-action link
- `{{ .Email }}` — recipient address (rendered in body copy)
- `{{ .SiteURL }}` — site origin (rendered in footer + logo link)

The unused variables (`{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Data }}`,
`{{ .RedirectTo }}`) are intentionally omitted — keeping the email lean
improves deliverability scores and makes the message read like normal
transactional mail rather than a debug dump.

## Preview tips

- Open the `.html` files directly in a browser — they render standalone.
- Toggle your OS dark mode to verify the dark-mode styles.
- Use [mail-tester.com](https://www.mail-tester.com/) to confirm spam
  score before going live.
