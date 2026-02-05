-- CCASP.nvim - lazy.nvim Plugin Specification
--
-- Add this to your lazy.nvim plugins:
--
-- {
--   dir = "path/to/ccasp.nvim",
--   -- or from GitHub:
--   -- "evan043/ccasp.nvim",
--   dependencies = {
--     "MunifTanjim/nui.nvim",
--     "nvim-telescope/telescope.nvim",
--     "akinsho/toggleterm.nvim",
--     "nvim-lua/plenary.nvim",
--   },
--   config = function()
--     require("ccasp").setup({
--       -- Override defaults here
--     })
--   end,
--   keys = {
--     { "<C-b>", "<cmd>CCASPToggle<cr>", desc = "Toggle CCASP sidebar" },
--     { "<leader>cc", "<cmd>CCASPOpen<cr>", desc = "Open CCASP" },
--   },
--   cmd = {
--     "CCASPOpen",
--     "CCASPClose",
--     "CCASPToggle",
--     "CCASPRun",
--     "CCASPSearch",
--   },
-- }

return {
  "evan043/ccasp.nvim",
  dependencies = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      -- Sidebar configuration
      sidebar = {
        width = 40,
        position = "left",
        auto_open = false,
      },

      -- Terminal configuration
      terminal = {
        shell = "claude",
        size = 60,
        direction = "vertical",
      },

      -- Keybindings
      keybindings = {
        toggle_sidebar = "<C-b>",
        toggle_focus = "<C-\\>",
        open_ccasp = "<leader>cc",
        run_last = "<leader>cr",
        quick_search = "<leader>cs",
        check_updates = "<leader>cu",
        toggle_perms = "<leader>cp",
      },
    })
  end,
  keys = {
    { "<C-b>", "<cmd>CCASPToggle<cr>", desc = "Toggle CCASP sidebar" },
    { "<C-\\>", function() require("ccasp").toggle_focus() end, desc = "Toggle CCASP focus" },
    { "<leader>cc", "<cmd>CCASPOpen<cr>", desc = "Open CCASP Control Center" },
    { "<leader>cr", function() require("ccasp").run_last_command() end, desc = "Run last command" },
    { "<leader>cs", function() require("ccasp").quick_search() end, desc = "Search commands" },
    { "<leader>cu", function() require("ccasp").check_updates() end, desc = "Check updates" },
    { "<leader>cp", function() require("ccasp").toggle_permissions() end, desc = "Toggle permissions" },
  },
  cmd = {
    "CCASPOpen",
    "CCASPClose",
    "CCASPToggle",
    "CCASPRun",
    "CCASPSearch",
  },
}
