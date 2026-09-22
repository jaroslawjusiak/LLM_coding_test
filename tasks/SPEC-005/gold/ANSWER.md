# Questions before implementing password reset

- What is the reset token lifetime, and is it single-use?
- Do existing sessions remain valid after a reset, or are they invalidated?
- What email is sent, and what should the message contain?
- Is there a rate limit on reset requests?
- What password requirements apply to the new password?
- What happens if the email does not exist? The response must not enable account enumeration.
