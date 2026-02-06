/**
 * CCASP Neovim Plugin - Configuration Module
 *
 * Handles plugin configuration, path detection, and config generation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin source directory (relative to this script)
export const PLUGIN_SOURCE = path.resolve(__dirname, '../../../nvim-ccasp');

// Common Neovim config locations
export const NVIM_CONFIG_PATHS = {
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'nvim'),
    path.join(process.env.APPDATA || '', 'nvim'),
  ],
  darwin: [
    path.join(process.env.HOME || '', '.config/nvim'),
    path.join(process.env.HOME || '', '.nvim'),
  ],
  linux: [
    path.join(process.env.HOME || '', '.config/nvim'),
    path.join(process.env.HOME || '', '.nvim'),
  ],
};

// Plugin installation paths for different plugin managers
export const PLUGIN_PATHS = {
  lazy: 'lua/plugins/ccasp.lua',
  packer: 'lua/plugins/ccasp.lua',
  manual: 'pack/ccasp/start/ccasp.nvim',
};

/**
 * Find existing Neovim config directory
 */
export function findNvimConfig() {
  const platform = process.platform;
  const paths = NVIM_CONFIG_PATHS[platform] || NVIM_CONFIG_PATHS.linux;

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Return first option as default
  return paths[0];
}

/**
 * Check if plugin source exists
 */
export function checkPluginSource() {
  if (!fs.existsSync(PLUGIN_SOURCE)) {
    console.error(chalk.red('Error: nvim-ccasp plugin source not found.'));
    console.error(chalk.dim(`Expected at: ${PLUGIN_SOURCE}`));
    process.exit(1);
  }
  return true;
}

/**
 * Generate lazy.nvim config snippet
 */
export function generateLazyConfig(pluginPath) {
  return `-- CCASP Neovim Control Center
-- Add this to your lazy.nvim plugin configuration

{
  dir = "${pluginPath.replace(/\\/g, '/')}",
  name = "ccasp.nvim",
  lazy = false,
  dependencies = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      -- Layout mode: "classic" (sidebar+terminal) or "modern" (floating panels)
      layout = "classic",

      -- Sidebar settings (left panel with commands)
      sidebar = {
        width = 40,
        position = "left",
        auto_open = true,
      },

      -- Terminal settings (right panel with Claude CLI)
      terminal = {
        shell = "claude",
        size = 60,
        direction = "vertical",
      },

      -- Keybindings
      keybindings = {
        toggle_sidebar = "<C-b>",
        toggle_focus = "<C-\\\\>",
        open_ccasp = "<leader>cc",
        run_last = "<leader>cr",
        quick_search = "<leader>cs",
      },

      -- Multi-session support
      -- Ctrl+Shift+N: New session
      -- \`: Quick toggle sessions
      -- Tab: Cycle sessions
    })
  end,
},
`;
}

/**
 * Generate packer.nvim config snippet
 */
export function generatePackerConfig(pluginPath) {
  return `-- CCASP Neovim Control Center
-- Add this to your packer.nvim plugin configuration

use {
  "${pluginPath.replace(/\\/g, '/')}",
  requires = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      layout = "classic",
      sidebar = { width = 40, position = "left", auto_open = true },
      terminal = { shell = "claude", size = 60, direction = "vertical" },
      keybindings = {
        toggle_sidebar = "<C-b>",
        toggle_focus = "<C-\\\\>",
      },
    })
  end,
}
`;
}
