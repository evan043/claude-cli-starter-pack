#!/usr/bin/env node
/**
 * Poll Deployment Status
 *
 * Polls deployment status until complete or timeout.
 * Supports Railway, Cloudflare, Vercel, and custom endpoints.
 *
 * Usage:
 *   node poll-deployment-status.js --platform railway --deployment-id abc123
 *   node poll-deployment-status.js --platform cloudflare --project-name my-project
 *   node poll-deployment-status.js --url https://api.example.com/status
 */

const POLL_INTERVAL = 5000; // 5 seconds
const DEFAULT_TIMEOUT = 300000; // 5 minutes

class DeploymentPoller {
  constructor(options) {
    this.platform = options.platform;
    this.deploymentId = options.deploymentId;
    this.projectName = options.projectName;
    this.projectId = options.projectId;
    this.url = options.url;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.verbose = options.verbose || false;
    this.startTime = Date.now();
  }

  async poll() {
    console.log(`\n🚀 Polling ${this.platform || 'custom'} deployment...`);
    console.log(`   Timeout: ${this.timeout / 1000}s\n`);

    let lastStatus = null;

    while (Date.now() - this.startTime < this.timeout) {
      try {
        const status = await this.checkStatus();

        if (status.status !== lastStatus) {
          this.logStatus(status);
          lastStatus = status.status;
        } else if (this.verbose) {
          process.stdout.write('.');
        }

        if (status.completed) {
          return this.handleCompletion(status);
        }

        await this.sleep(POLL_INTERVAL);
      } catch (error) {
        console.error(`\n❌ Error polling: ${error.message}`);
        if (this.verbose) console.error(error);
        await this.sleep(POLL_INTERVAL);
      }
    }

    console.error(`\n⏰ Timeout after ${this.timeout / 1000}s`);
    return { success: false, reason: 'timeout' };
  }

  async checkStatus() {
    switch (this.platform) {
      case 'railway':
        return this.checkRailway();
      case 'cloudflare':
        return this.checkCloudflare();
      case 'vercel':
        return this.checkVercel();
      case 'custom':
        return this.checkCustom();
      default:
        throw new Error(`Unknown platform: ${this.platform}`);
    }
  }

  async checkRailway() {
    const token = process.env.RAILWAY_API_TOKEN;
    if (!token) throw new Error('RAILWAY_API_TOKEN not set');

    const query = `
      query GetDeployment($id: String!) {
        deployment(id: $id) {
          id
          status
          createdAt
          staticUrl
          meta
        }
      }
    `;

    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: this.deploymentId },
      }),
    });

    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);

    const deployment = data.data.deployment;
    const status = deployment.status;

    return {
      status,
      completed: ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED'].includes(status),
      success: status === 'SUCCESS',
      url: deployment.staticUrl,
      details: deployment,
    };
  }

  async checkCloudflare() {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token) throw new Error('CLOUDFLARE_API_TOKEN not set');

    // Get latest deployment
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${this.projectName}/deployments`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.errors[0].message);

    const deployment = data.result[0]; // Latest deployment
    const status = deployment.latest_stage?.status || 'unknown';

    return {
      status,
      completed: ['success', 'failure', 'canceled'].includes(status),
      success: status === 'success',
      url: deployment.url,
      details: deployment,
    };
  }

  async checkVercel() {
    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error('VERCEL_TOKEN not set');

    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${this.deploymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const deployment = await response.json();
    const status = deployment.readyState;

    return {
      status,
      completed: ['READY', 'ERROR', 'CANCELED'].includes(status),
      success: status === 'READY',
      url: deployment.url,
      details: deployment,
    };
  }

  async checkCustom() {
    const response = await fetch(this.url);
    const data = await response.json();

    return {
      status: data.status || 'unknown',
      completed: data.completed || false,
      success: data.success || data.status === 'success',
      url: data.url,
      details: data,
    };
  }

  logStatus(status) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const icon = status.success ? '✅' :
                 status.completed ? '❌' : '🔄';
    console.log(`${icon} [${elapsed}s] Status: ${status.status}`);
  }

  handleCompletion(status) {
    console.log('\n' + '='.repeat(50));
    if (status.success) {
      console.log('✅ Deployment completed successfully!');
      if (status.url) {
        console.log(`🔗 URL: ${status.url}`);
      }
    } else {
      console.log('❌ Deployment failed');
      if (this.verbose && status.details) {
        console.log('Details:', JSON.stringify(status.details, null, 2));
      }
    }
    console.log('='.repeat(50) + '\n');

    return {
      success: status.success,
      status: status.status,
      url: status.url,
      duration: Date.now() - this.startTime,
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  const getArg = (name) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : null;
  };

  const hasFlag = (name) => args.includes(`--${name}`);

  const options = {
    platform: getArg('platform') || 'railway',
    deploymentId: getArg('deployment-id'),
    projectName: getArg('project-name'),
    projectId: getArg('project-id'),
    url: getArg('url'),
    timeout: parseInt(getArg('timeout') || '300') * 1000,
    verbose: hasFlag('verbose') || hasFlag('v'),
  };

  if (options.platform !== 'custom' && !options.deploymentId && !options.projectName) {
    console.error('Usage: node poll-deployment-status.js --platform <railway|cloudflare|vercel|custom>');
    console.error('  --deployment-id <id>   Deployment ID (Railway, Vercel)');
    console.error('  --project-name <name>  Project name (Cloudflare)');
    console.error('  --timeout <seconds>    Timeout in seconds (default: 300)');
    console.error('  --verbose              Show detailed output');
    console.error('  --url <url>            Custom status endpoint');
    process.exit(1);
  }

  const poller = new DeploymentPoller(options);
  const result = await poller.poll();
  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
