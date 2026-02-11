-- Example lazy.nvim configuration for ccasp.nvim
-- Add this to your lazy.nvim plugin specs

return {
  -- CCASP Neovim Integration
  {
    dir = "~/path/to/nvim-ccasp", -- or use git URL when published
    dependencies = {
      "nvim-lua/plenary.nvim",
      "nvim-telescope/telescope.nvim",
      "MunifTanjim/nui.nvim",
      "grapp-dev/nui-components.nvim",
      "folke/which-key.nvim", -- optional
    },
    keys = {
      -- Lazy load on these keys
      { "<leader>cg", desc = "CCASP: Agent Grid" },
      { "<leader>cp", desc = "CCASP: Control Panel" },
      { "<leader>cd", desc = "CCASP: Dashboard" },
    },
    cmd = {
      "CcaspDashboard",
      "CcaspControl",
      "CcaspGrid",
      "CcaspFeatures",
      "CcaspHooks",
    },
    config = function()
      require("ccasp").setup({
        -- Customize the agent grid
        grid = {
          rows = 3,
          cols = 2,
          agents = {
            -- Customize agents for your workflow
            { name = "architect", role = "System Design", model = "opus" },
            { name = "frontend", role = "React/Vue/etc", model = "sonnet" },
            { name = "backend", role = "API Development", model = "sonnet" },
            { name = "database", role = "Schema & Queries", model = "sonnet" },
            { name = "devops", role = "CI/CD & Infra", model = "sonnet" },
            { name = "qa", role = "Testing & QA", model = "haiku" },
          },
        },

        -- Control panel position
        control_panel = {
          position = "right", -- keeps it out of the way
          width = 45,
          border = "rounded",
        },

        -- Claude defaults
        claude = {
          default_model = "sonnet",
          auto_commit = false,
          write_files = true,
        },

        -- Key prefix
        keys = {
          prefix = "<leader>c",
        },
      })

      -- Optional: Which-key integration
      local ok, wk = pcall(require, "which-key")
      if ok then
        wk.add({
          { "<leader>c", group = "CCASP" },
        })
      end

      -- Optional: Add to lualine
      local lualine_ok, _ = pcall(require, "lualine")
      if lualine_ok then
        -- You can add ccasp components to your lualine config
        -- See README for details
      end
    end,
  },
}
