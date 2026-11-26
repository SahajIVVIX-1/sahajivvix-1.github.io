# Smaran

Gentle reminders for Windows. Type what to remember and when, the way you would say it ("stretch every 45 min", "call mom at 6pm"), and at the right moment Smaran slides in a small calm card with Done and Snooze. It lives in the Windows tray and can also run your PC's routines. The product page and the downloads are in this repository (Smaran-Studio); the app itself is built in a separate private repository.

## What it does

- **Quick add.** Plain sentences become schedules: once, every few minutes or hours, daily at several times, weekly on chosen days, monthly (even the last day) or yearly. Repeating reminders can keep to set hours and weekdays.
- **Cards that slide in.** A small pill with the title opens into the full card when you point at it. Normal reminders hide themselves after a few seconds; important ones stay until you act and come through quiet hours and full-screen apps.
- **Quiet hours and focus.** Normal reminders are held while a full-screen app, game or presentation is showing and delivered afterwards. Everything can be paused from the tray.
- **Snooze and follow-ups.** Snooze for 5 minutes, 15 minutes, an hour or until tomorrow; if you do not respond Smaran can remind again a chosen number of times.
- **Rotating lines.** A reminder can carry a list of lines (stretches, affirmations, tips) shown in order or shuffled.
- **History and backups.** Every reminder outcome (done, snoozed, missed, skipped) and every automation run is recorded with a weekly summary. Five rolling backups are kept, and reminders can be restored or merged from a file, including from older versions.
- **Your look.** Light, dark or follow Windows, three card sizes, a chime and a colour per reminder, your own fonts, and the corner and screen where cards appear.

## Automations

Like a friendly Task Scheduler. Pick when, pick what, and Smaran does it; up to 20 steps can be chained, each with an optional wait.

- **When:** at a date and time or on a repeat, when the computer starts, when you sign in or when Smaran opens, when you lock or unlock the PC, when it goes to sleep or wakes up, when the charger is plugged in or removed, and after you have been away for some minutes or come back.
- **Do:** lock, sign out, sleep, hibernate, shut down or restart; open any app with arguments; open a file or folder; run a .bat, .cmd or .ps1 script; open a link in the default browser or one you choose, with a private-window option.
- **Safe by default.** Before signing out, sleeping or shutting down, a card counts down 30 seconds with Cancel and Run Now. A time missed while the PC was asleep or off is skipped and never run late, and every run is logged as ran, failed (with the reason), cancelled or skipped.

## Licensing

Smaran installs and opens only with a valid licence image. The licence format is an Ed25519-signed payload hidden in the low bits of a PNG's pixels (a JPG carries it in a comment segment) and is verified offline against a public key built into the app. A licence names the authorised services (Reminders, Automations, File Server, Remote Hub) and a duration of up to 100 years, and trial licences of up to 30 days exist. The private signing key is never in a repository: it is sealed with a passphrase (PBKDF2-SHA256, 600,000 iterations, then AES-256-GCM) and unlocked in the browser on an unlisted Register page, which signs the card on the visitor's own machine. Offline licensing deters copying but cannot make it impossible.

## Built with

Electron, React and TypeScript, with Zod schemas for the config, electron-vite and Tailwind CSS. Tests run on a temporary data folder: Vitest unit tests, Playwright end-to-end tests against the real app and a smoke test of the packaged build. electron-builder produces an NSIS installer and a portable exe (the portable build keeps its data in a SmaranData folder next to the exe). The installer and the portable exe are the same file: started under a name containing "Setup", it shows its own installer window and installs itself for the current user.

## Release

Version 3.6.0 for Windows 10 and 11, as an installer or a portable exe. Builds are unsigned, so SmartScreen shows an unknown-publisher screen the first time.

## This repository

A static website: the product page (index.html, features, automations, licensing and downloads), a licence Register page that unlocks the sealed key in the browser, and the licence-format code shared with the app.
