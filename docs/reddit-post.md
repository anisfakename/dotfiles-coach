# Reddit Post — r/GithubCopilot

**Title:** I built a CLI that analyzes your shell history and uses Copilot CLI to suggest aliases/functions tailored to YOUR workflow

**Body:**

I just finished building **Dotfiles Coach** for the GitHub Copilot CLI Challenge on DEV.to and wanted to share it here.

**The problem:** We all type the same commands hundreds of times a day. `git add . && git commit -m "..." && git push`. `docker compose up -d`. We know we *should* create aliases, but who actually audits their `.bash_history` to find the patterns?

**What it does:**

- `dotfiles-coach analyze` — Parses your shell history (Bash, Zsh, or PowerShell) and finds your most repeated command patterns using frequency analysis. Also flags dangerous commands like `rm -rf` without safeguards. This step is 100% local, no network.
- `dotfiles-coach suggest` — Takes your top patterns, scrubs all secrets locally (12 regex filters — passwords, API keys, SSH keys, AWS creds, tokens, etc.), then sends the clean data to `gh copilot suggest` to generate shell-specific aliases and functions.
- `dotfiles-coach apply` — Writes suggestions to a config file with automatic backups and dry-run preview. Never auto-sources anything.
- `dotfiles-coach report` — Generates a Markdown/JSON summary.

**Privacy:** The thing I care about most — your shell history is full of secrets. Every command goes through mandatory scrubbing before touching Copilot. Passwords, tokens, SSH keys, AWS access keys, GitHub tokens, URLs with credentials, Bearer headers, Base64 blobs — all replaced with `[REDACTED]`. This layer can't be disabled.

**How Copilot is used:** There's no Copilot npm SDK, so the tool wraps `gh copilot suggest` as a child process via `execa`. No API tokens needed — it uses your existing `gh auth` session. The cool part is Copilot doesn't just suggest individual aliases — it recognizes command *sequences* and suggests combined functions.

**Stats:** 290 tests, TypeScript strict mode, multi-shell support, mock client for testing without Copilot.

GitHub: https://github.com/OlaProeis/dotfiles-coach

DEV.to submission: [link to your DEV.to post once published]

Built with AI assistance (Copilot + Cursor). Feedback welcome — what patterns would you want it to detect?

---

# Cross-posting suggestions

Here are subreddits and communities where this post would be relevant:

## Reddit

1. **r/GithubCopilot** — Primary target. Directly relevant audience.
2. **r/commandline** — CLI tool enthusiasts, shell customization crowd. They'll appreciate the dotfiles angle.
3. **r/bash** — Bash-specific audience who care about aliases, functions, and shell optimization.
4. **r/zsh** — Same but for Zsh users. Mention Oh My Zsh compatibility.
5. **r/node** — Node.js/TypeScript community. Highlight the tech stack and testing approach.
6. **r/devops** — DevOps folks who live in the terminal. The safety detection angle resonates here.
7. **r/coding** or **r/programming** — General developer audience. Keep it high-level.
8. **r/sideproject** — Community for sharing personal projects. Good for general exposure.
9. **r/opensource** — If you add the MIT license badge, fits well here.

## Other platforms

10. **Hacker News (news.ycombinator.com)** — "Show HN: Dotfiles Coach – CLI that analyzes your shell history with Copilot". HN loves CLI tools and privacy-first design.
11. **Twitter/X** — Short thread format: problem → solution → demo gif → link. Tag @github and @GitHubCopilot.
12. **LinkedIn** — More professional angle: "Built this for the GitHub Copilot CLI Challenge" with the cover image.
13. **Product Hunt** — If you want broader visibility beyond developers.
14. **Lobste.rs** — Similar to HN, developer-focused. Needs an invite to post.

## Tips for cross-posting

- **Tailor each post** — Reddit communities hate copy-paste spam. Adjust the tone:
  - r/commandline: Focus on the dotfiles/alias generation angle
  - r/node: Focus on the TypeScript architecture, vitest, ESM setup
  - r/devops: Focus on safety detection and secret scrubbing
  - r/bash: Focus on history parsing and Bash-specific features
- **Don't post to all at once** — Space them out over a few days
- **Engage with comments** — Reply to every comment, especially critical ones
- **Add a demo GIF** — Screen recordings perform much better than screenshots on Reddit
