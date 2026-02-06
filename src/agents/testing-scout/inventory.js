/**
 * Testing tool inventory management
 * Part of TestingScout agent
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Get inventory path
 * @param {string} projectRoot - Project root
 * @returns {string} Path to inventory
 */
export function getInventoryPath(projectRoot = process.cwd()) {
  return join(projectRoot, 'repo-settings', 'Testing-Tool-Inventory.json');
}

/**
 * Load inventory
 * @param {string} projectRoot - Project root
 * @returns {object} Inventory data
 */
export function loadInventory(projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);

  if (!existsSync(inventoryPath)) {
    return { runs: [] };
  }

  try {
    return JSON.parse(readFileSync(inventoryPath, 'utf8'));
  } catch {
    return { runs: [] };
  }
}

/**
 * Save to inventory
 * @param {object} entry - Entry to save
 * @param {string} projectRoot - Project root
 */
export function saveToInventory(entry, projectRoot = process.cwd()) {
  const inventoryPath = getInventoryPath(projectRoot);
  const dir = dirname(inventoryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const inventory = loadInventory(projectRoot);
  inventory.runs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
}
