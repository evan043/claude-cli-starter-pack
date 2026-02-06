-- Plenary test for nvim-ccasp Help system
-- Tests: module loads, topic list, search, wiki content

local helpers = require("tests.helpers")

describe("CCASP Help System", function()

  it("help/init.lua loads without errors", helpers.with_clean_state(function()
    local ok, help = pcall(require, "ccasp.help")
    assert.is_true(ok, "Failed to require ccasp.help: " .. tostring(help))
    assert.is_not_nil(help.open)
    assert.is_not_nil(help.close)
    assert.is_not_nil(help.toggle)
    assert.is_not_nil(help.show_topic)
    assert.is_not_nil(help.show_topic_list)
  end))

  it("help/wiki_content.lua loads all 11 topics", helpers.with_clean_state(function()
    local ok, wiki = pcall(require, "ccasp.help.wiki_content")
    assert.is_true(ok, "Failed to require wiki_content: " .. tostring(wiki))

    local topics = wiki.get_topic_list()
    assert.is_table(topics)
    assert.equals(11, #topics, "Expected 11 wiki topics")

    for _, topic in ipairs(topics) do
      assert.is_not_nil(topic.id, "Topic missing id")
      assert.is_not_nil(topic.title, "Topic missing title")
      assert.is_not_nil(topic.icon, "Topic missing icon")
    end
  end))

  it("wiki_content.get_topic returns content for valid ID", helpers.with_clean_state(function()
    local wiki = require("ccasp.help.wiki_content")

    local topic = wiki.get_topic("getting-started")
    assert.is_not_nil(topic, "Expected getting-started topic")
    assert.equals("Getting Started", topic.title)
    assert.is_table(topic.content)
    assert.is_true(#topic.content > 0, "Expected non-empty content")
  end))

  it("wiki_content.get_topic returns nil for invalid ID", helpers.with_clean_state(function()
    local wiki = require("ccasp.help.wiki_content")
    local topic = wiki.get_topic("nonexistent-topic")
    assert.is_nil(topic)
  end))

  it("wiki_content.search finds matching topics", helpers.with_clean_state(function()
    local wiki = require("ccasp.help.wiki_content")

    local results = wiki.search("deployment")
    assert.is_table(results)
    assert.is_true(#results > 0, "Expected search results for 'deployment'")

    -- Results should be sorted by score
    for i = 1, #results - 1 do
      assert.is_true(results[i].score >= results[i + 1].score,
        "Results should be sorted by score descending")
    end
  end))

  it("wiki_content.search returns empty for no match", helpers.with_clean_state(function()
    local wiki = require("ccasp.help.wiki_content")
    local results = wiki.search("zzzznonexistenttermzzz")
    assert.is_table(results)
    assert.equals(0, #results)
  end))

  it("wiki_content.search handles empty query", helpers.with_clean_state(function()
    local wiki = require("ccasp.help.wiki_content")
    local results = wiki.search("")
    assert.is_table(results)
    assert.equals(0, #results)
  end))

  it("help/search.lua loads without errors", helpers.with_clean_state(function()
    local ok, search = pcall(require, "ccasp.help.search")
    assert.is_true(ok, "Failed to require help.search: " .. tostring(search))
    assert.is_not_nil(search.open)
    assert.is_not_nil(search.fallback_search)
  end))

end)
