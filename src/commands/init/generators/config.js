/**
 * Configuration File Generators
 *
 * Generate settings.json and other config files for Claude Code CLI.
 */

/**
 * Generate settings.json with CCASP update check hook, usage tracking, and GitHub progress sync
 */
export function generateSettingsJson(projectName) {
  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      permissions: {
        allow: [],
        deny: [],
      },
      hooks: {
        UserPromptSubmit: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/ccasp-update-check.js',
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Skill|Read',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/usage-tracking.js',
              },
            ],
          },
          {
            matcher: 'TodoWrite',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/github-progress-hook.cjs',
              },
            ],
          },
        ],
      },
    },
    null,
    2
  );
}

/**
 * Generate settings.local.json
 */
export function generateSettingsLocalJson() {
  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      permissions: {
        allow: [],
        deny: [],
      },
      hooks: {},
    },
    null,
    2
  );
}
