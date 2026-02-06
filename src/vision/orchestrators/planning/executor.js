/**
 * Orchestrator Planning - Main Executor
 * Handles Epic, Roadmap, and Phase-Dev-Plan creation
 */

import { loadVision, updateVision } from '../../state-manager.js';
import { createEpic, createRoadmapPlaceholder } from '../../../epic/schema.js';
import {
  getGitHubConfig,
  ensureEpicIssue,
  ensureRoadmapIssue,
  ensurePlanIssue
} from '../../../github/issue-hierarchy-manager.js';
import { log, transitionStage, OrchestratorStage } from '../lifecycle.js';
import { analyzeRoadmapBreakdown } from './breakdown.js';
import { createExplorationDocs } from './docs.js';
import { decidePlanType, PlanType } from '../../decision-engine.js';
import fs from 'fs';
import path from 'path';

/**
 * Run the planning phase - Create Epic, Roadmaps, and Phase-Dev-Plans
 */
export async function plan(orchestrator) {
  transitionStage(orchestrator, OrchestratorStage.PLANNING);

  if (!orchestrator.vision) {
    throw new Error('Vision not initialized. Call initialize() first.');
  }

  try {
    log(orchestrator, 'info', 'Starting planning phase...');

    const planningResult = {
      epic: null,
      roadmaps: [],
      phaseDevPlans: [],
      githubIssues: {
        created: [],
        existing: []
      }
    };

    // Step 1: Run decision engine to determine plan type
    const features = orchestrator.vision.metadata?.features || [];
    const complexity = orchestrator.vision.metadata?.estimated_complexity || 'medium';
    const technologies = orchestrator.vision.prompt?.technologies || [];
    const parsedPrompt = orchestrator.vision.prompt || {};

    const decision = decidePlanType(parsedPrompt, complexity, {
      override: orchestrator.config?.planTypeOverride || null
    });

    log(orchestrator, 'info', `Decision engine: ${decision.planType} (score: ${decision.score}, confidence: ${decision.confidence})`);
    log(orchestrator, 'info', `Reasoning: ${decision.reasoning}`);

    // Store decision in planning result
    planningResult.decision = decision;

    // Update vision with decision
    await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
      vision.plan_type = decision.planType;
      vision.decision = {
        planType: decision.planType,
        score: decision.score,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        decided_at: new Date().toISOString()
      };
      return vision;
    });

    // For task-list: create only a flat PROGRESS.json and return early
    if (decision.planType === PlanType.TASK_LIST) {
      log(orchestrator, 'info', 'Creating task-list (no epic/roadmap hierarchy)');
      const planSlug = orchestrator.vision.slug;
      const planDir = path.join(orchestrator.projectRoot, '.claude', 'phase-plans', planSlug);

      if (!fs.existsSync(planDir)) {
        fs.mkdirSync(planDir, { recursive: true });
      }

      const progressData = {
        slug: planSlug,
        project: { name: orchestrator.vision.title, slug: planSlug },
        status: 'not_started',
        completion_percentage: 0,
        plan_type: PlanType.TASK_LIST,
        phases: [{
          id: 1,
          name: orchestrator.vision.title,
          status: 'not_started',
          tasks: features.map((f, i) => ({
            id: i + 1,
            name: f.feature || f.name || f,
            description: '',
            status: 'pending',
            completed: false
          }))
        }],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          vision_slug: orchestrator.vision.slug
        },
        github_issue: null
      };

      // Ensure at least one task
      if (progressData.phases[0].tasks.length === 0) {
        progressData.phases[0].tasks.push({
          id: 1, name: 'Implement core functionality', description: '', status: 'pending', completed: false
        });
      }

      const progressPath = path.join(planDir, 'PROGRESS.json');
      fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf8');
      planningResult.phaseDevPlans.push(progressData);

      log(orchestrator, 'info', `Created task-list: ${planSlug} with ${progressData.phases[0].tasks.length} task(s)`);

      await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
        vision.orchestrator.stage = orchestrator.stage;
        vision.planning = { plan_type: PlanType.TASK_LIST, plan_slug: planSlug };
        return vision;
      });

      orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);
      return { success: true, stage: orchestrator.stage, result: planningResult };
    }

    // For phase-dev-plan: create PROGRESS.json with phases but no epic/roadmap
    if (decision.planType === PlanType.PHASE_DEV_PLAN) {
      log(orchestrator, 'info', 'Creating phase-dev-plan (no epic/roadmap hierarchy)');
      const roadmapBreakdown = analyzeRoadmapBreakdown(orchestrator, features, technologies, complexity);
      const planSlug = orchestrator.vision.slug;
      const planDir = path.join(orchestrator.projectRoot, '.claude', 'phase-plans', planSlug);

      if (!fs.existsSync(planDir)) {
        fs.mkdirSync(planDir, { recursive: true });
      }

      const allPhases = roadmapBreakdown.flatMap((rm, rmIdx) =>
        rm.phases.map((phase, phaseIdx) => ({
          id: rmIdx * 10 + phaseIdx + 1,
          name: phase.title,
          status: 'not_started',
          tasks: phase.tasks.map((task, taskIdx) => ({
            id: taskIdx + 1,
            name: task.name || task,
            description: task.description || '',
            status: 'pending',
            completed: false
          }))
        }))
      );

      const progressData = {
        slug: planSlug,
        project: { name: orchestrator.vision.title, slug: planSlug },
        status: 'not_started',
        completion_percentage: 0,
        plan_type: PlanType.PHASE_DEV_PLAN,
        phases: allPhases.length > 0 ? allPhases : [{
          id: 1, name: 'Core Implementation', status: 'not_started',
          tasks: [{ id: 1, name: 'Implement core functionality', description: '', status: 'pending', completed: false }]
        }],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          vision_slug: orchestrator.vision.slug
        },
        github_issue: null
      };

      const progressPath = path.join(planDir, 'PROGRESS.json');
      fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf8');
      planningResult.phaseDevPlans.push(progressData);

      log(orchestrator, 'info', `Created phase-dev-plan: ${planSlug} with ${allPhases.length} phase(s)`);

      await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
        vision.orchestrator.stage = orchestrator.stage;
        vision.planning = { plan_type: PlanType.PHASE_DEV_PLAN, plan_slug: planSlug };
        return vision;
      });

      orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);
      return { success: true, stage: orchestrator.stage, result: planningResult };
    }

    // For roadmap/epic/vision-full: proceed with full hierarchy creation
    log(orchestrator, 'info', 'Analyzing scope for roadmap breakdown...');
    const roadmapBreakdown = analyzeRoadmapBreakdown(orchestrator, features, technologies, complexity);

    log(orchestrator, 'info', `Planning ${roadmapBreakdown.length} roadmap(s) for vision`);

    // Step 2: Create Epic
    const epicSlug = orchestrator.vision.slug;
    const epicDir = path.join(orchestrator.projectRoot, '.claude', 'epics', epicSlug);

    // Ensure directory exists
    if (!fs.existsSync(epicDir)) {
      fs.mkdirSync(epicDir, { recursive: true });
    }

    const epicData = createEpic({
      title: orchestrator.vision.title,
      description: orchestrator.vision.description || orchestrator.vision.prompt?.summary || '',
      business_objective: orchestrator.vision.metadata?.detected_intent || orchestrator.vision.title,
      roadmap_count: roadmapBreakdown.length,
      roadmaps: roadmapBreakdown.map((r, index) => createRoadmapPlaceholder({
        roadmap_index: index,
        title: r.title,
        description: r.description,
        phase_count: r.phases?.length || 0,
        depends_on: r.depends_on || []
      })),
      metadata: {
        created_by: 'vision-orchestrator',
        vision_slug: orchestrator.vision.slug,
        tags: orchestrator.vision.tags || [],
        priority: orchestrator.vision.priority || 'medium'
      }
    });

    // Save Epic
    const epicPath = path.join(epicDir, 'EPIC.json');
    fs.writeFileSync(epicPath, JSON.stringify(epicData, null, 2), 'utf8');
    planningResult.epic = epicData;

    log(orchestrator, 'info', `Created Epic: ${epicSlug}`);

    // Step 3: Create Roadmaps
    for (let i = 0; i < roadmapBreakdown.length; i++) {
      const roadmapSpec = roadmapBreakdown[i];
      const roadmapSlug = `${epicSlug}-roadmap-${i + 1}`;
      const roadmapDir = path.join(orchestrator.projectRoot, '.claude', 'roadmaps', roadmapSlug);
      const explorationDir = path.join(roadmapDir, 'exploration');

      // Ensure directories exist
      if (!fs.existsSync(explorationDir)) {
        fs.mkdirSync(explorationDir, { recursive: true });
      }

      // Create ROADMAP.json with phase_dev_plan_refs structure
      const roadmapData = {
        slug: roadmapSlug,
        title: roadmapSpec.title,
        description: roadmapSpec.description,
        status: 'not_started',
        completion_percentage: 0,

        // Parent epic reference
        parent_epic: {
          slug: epicSlug,
          epic_path: `.claude/epics/${epicSlug}/EPIC.json`
        },

        // Phase-dev-plan references (will be populated during execution)
        phase_dev_plan_refs: roadmapSpec.phases.map((phase, phaseIndex) => ({
          slug: `${roadmapSlug}-phase-${phaseIndex + 1}`,
          title: phase.title,
          status: 'not_started',
          completion_percentage: 0,
          progress_file: `.claude/phase-plans/${roadmapSlug}-phase-${phaseIndex + 1}/PROGRESS.json`
        })),

        // Cross-plan dependencies
        cross_plan_dependencies: roadmapSpec.dependencies || [],

        // Metadata
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          vision_slug: orchestrator.vision.slug,
          roadmap_index: i,
          github_epic_number: null
        }
      };

      // Save ROADMAP.json
      const roadmapPath = path.join(roadmapDir, 'ROADMAP.json');
      fs.writeFileSync(roadmapPath, JSON.stringify(roadmapData, null, 2), 'utf8');

      // Create exploration documentation files
      await createExplorationDocs(explorationDir, roadmapSpec, roadmapSlug);

      // Update epic's roadmap placeholder with path
      epicData.roadmaps[i].path = `.claude/roadmaps/${roadmapSlug}/ROADMAP.json`;

      planningResult.roadmaps.push(roadmapData);
      log(orchestrator, 'info', `Created Roadmap: ${roadmapSlug} with ${roadmapSpec.phases.length} phase(s)`);

      // Step 4: Create Phase-Dev-Plans (PROGRESS.json files)
      for (let j = 0; j < roadmapSpec.phases.length; j++) {
        const phaseSpec = roadmapSpec.phases[j];
        const planSlug = `${roadmapSlug}-phase-${j + 1}`;
        const planDir = path.join(orchestrator.projectRoot, '.claude', 'phase-plans', planSlug);

        if (!fs.existsSync(planDir)) {
          fs.mkdirSync(planDir, { recursive: true });
        }

        // Create PROGRESS.json
        const progressData = {
          slug: planSlug,
          project: {
            name: phaseSpec.title,
            slug: planSlug
          },
          status: 'not_started',
          completion_percentage: 0,

          // Parent context
          parent_context: {
            type: 'roadmap',
            path: `.claude/roadmaps/${roadmapSlug}/ROADMAP.json`,
            slug: roadmapSlug
          },

          // Phases with tasks
          phases: [{
            id: 1,
            name: phaseSpec.title,
            status: 'not_started',
            tasks: phaseSpec.tasks.map((task, taskIndex) => ({
              id: taskIndex + 1,
              name: task.name || task,
              description: task.description || '',
              status: 'pending',
              completed: false
            }))
          }],

          // Metadata
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            vision_slug: orchestrator.vision.slug,
            roadmap_slug: roadmapSlug
          },

          // GitHub issue placeholder
          github_issue: null,
          github_issue_url: null
        };

        const progressPath = path.join(planDir, 'PROGRESS.json');
        fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf8');

        planningResult.phaseDevPlans.push(progressData);
        log(orchestrator, 'info', `Created Phase-Dev-Plan: ${planSlug} with ${phaseSpec.tasks.length} task(s)`);
      }
    }

    // Update Epic file with roadmap paths
    fs.writeFileSync(epicPath, JSON.stringify(epicData, null, 2), 'utf8');

    // Step 5: Create GitHub Issues (if GitHub is configured)
    const githubConfig = getGitHubConfig(orchestrator.projectRoot);
    if (githubConfig) {
      log(orchestrator, 'info', 'Creating GitHub issues for hierarchy...');

      // Create Epic issue
      const epicIssueResult = await ensureEpicIssue(orchestrator.projectRoot, epicSlug, epicData, githubConfig);
      if (epicIssueResult.success && epicIssueResult.created) {
        planningResult.githubIssues.created.push({
          type: 'epic',
          number: epicIssueResult.issueNumber
        });
        log(orchestrator, 'info', `Created Epic GitHub issue #${epicIssueResult.issueNumber}`);
      }

      // Create Roadmap issues
      for (const roadmapData of planningResult.roadmaps) {
        const roadmapIssueResult = await ensureRoadmapIssue(
          orchestrator.projectRoot,
          roadmapData.slug,
          roadmapData,
          githubConfig,
          { slug: epicSlug, github_issue: epicData.github_epic_number }
        );
        if (roadmapIssueResult.success && roadmapIssueResult.created) {
          planningResult.githubIssues.created.push({
            type: 'roadmap',
            slug: roadmapData.slug,
            number: roadmapIssueResult.issueNumber
          });
          log(orchestrator, 'info', `Created Roadmap GitHub issue #${roadmapIssueResult.issueNumber}`);
        }
      }

      // Create Phase-Dev-Plan issues
      for (const planData of planningResult.phaseDevPlans) {
        const planIssueResult = await ensurePlanIssue(
          orchestrator.projectRoot,
          planData.slug,
          planData,
          githubConfig,
          { slug: planData.parent_context.slug, github_issue: null }, // roadmap context
          { slug: epicSlug, github_issue: epicData.github_epic_number } // epic context
        );
        if (planIssueResult.success && planIssueResult.created) {
          planningResult.githubIssues.created.push({
            type: 'plan',
            slug: planData.slug,
            number: planIssueResult.issueNumber
          });
          log(orchestrator, 'info', `Created Phase-Dev-Plan GitHub issue #${planIssueResult.issueNumber}`);
        }
      }
    } else {
      log(orchestrator, 'info', 'GitHub not configured, skipping issue creation');
    }

    // Step 6: Update Vision with planning results
    await updateVision(orchestrator.projectRoot, orchestrator.vision.slug, (vision) => {
      vision.orchestrator.stage = orchestrator.stage;
      vision.planning = {
        epic_slug: epicSlug,
        epic_path: `.claude/epics/${epicSlug}/EPIC.json`,
        roadmap_count: planningResult.roadmaps.length,
        roadmaps: planningResult.roadmaps.map(r => ({
          slug: r.slug,
          path: `.claude/roadmaps/${r.slug}/ROADMAP.json`
        })),
        phase_dev_plan_count: planningResult.phaseDevPlans.length,
        github_issues_created: planningResult.githubIssues.created.length
      };
      return vision;
    });

    orchestrator.vision = await loadVision(orchestrator.projectRoot, orchestrator.vision.slug);

    log(orchestrator, 'info', 'Planning phase complete', {
      epic: epicSlug,
      roadmaps: planningResult.roadmaps.length,
      phaseDevPlans: planningResult.phaseDevPlans.length,
      githubIssues: planningResult.githubIssues.created.length
    });

    return {
      success: true,
      stage: orchestrator.stage,
      result: planningResult
    };

  } catch (error) {
    log(orchestrator, 'error', `Planning failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stage: orchestrator.stage
    };
  }
}
