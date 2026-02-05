/**
 * Vision Mode Integration Example
 * Demonstrates how ASCII UI Generator integrates with Vision Mode workflows
 */

import {
  generateASCIIWireframe,
  generateComponentBox,
  extractComponentList,
} from './ascii-generator.js';

/**
 * Example 1: Screenshot Analysis → ASCII Wireframe
 * Simulates converting a screenshot analysis into an ASCII wireframe
 */
export function screenshotToWireframe(analysisData) {
  console.log('\n=== Screenshot to Wireframe Conversion ===\n');

  // Simulated screenshot analysis output
  const analysis = analysisData || {
    layout: 'dashboard',
    components: {
      navbar: {
        detected: true,
        items: ['Dashboard', 'Analytics', 'Settings', 'Profile'],
        logo: '[MyApp]',
        actions: ['[🔔]', '[👤]']
      },
      sidebar: {
        detected: true,
        items: ['Overview', 'Customers', 'Products', 'Orders', 'Reports']
      },
      mainContent: {
        type: 'stats-cards',
        stats: [
          { title: 'Total Sales', value: '$45,231' },
          { title: 'New Customers', value: '142' },
          { title: 'Pending Orders', value: '28' }
        ]
      }
    },
    width: 70
  };

  // Generate wireframe
  const wireframe = generateASCIIWireframe({
    navbar: analysis.components.navbar,
    sidebar: analysis.components.sidebar,
    stats: analysis.components.mainContent.stats
  }, {
    type: analysis.layout,
    width: analysis.width
  });

  console.log('Generated Wireframe:');
  console.log(wireframe);

  return wireframe;
}

/**
 * Example 2: Component Library Generation
 * Generate a library of reusable component wireframes
 */
export function generateComponentLibrary() {
  console.log('\n=== Component Library ===\n');

  const components = {
    'Primary Button': generateComponentBox('Primary Button', 25, 5, {
      content: ['backgroundColor: blue', 'color: white', 'onClick: handleClick']
    }),

    'Input Field': generateComponentBox('Input Field', 30, 6, {
      content: ['type: text', 'placeholder: "Enter text"', 'value: {state}', 'onChange: handleChange']
    }),

    'Icon Button': generateComponentBox('Icon Button', 20, 5, {
      content: ['icon: [🔔]', 'size: small', 'onClick: notify']
    })
  };

  Object.entries(components).forEach(([name, wireframe]) => {
    console.log(`\n${name}:`);
    console.log(wireframe);
  });

  return components;
}

/**
 * Example 3: Design System Documentation
 * Generate ASCII representations for design system documentation
 */
export function generateDesignSystemDocs() {
  console.log('\n=== Design System Documentation ===\n');

  const patterns = {
    'Navigation Pattern': generateASCIIWireframe({
      navbar: {
        items: ['Home', 'Products', 'About', 'Contact']
      }
    }, { type: 'dashboard', width: 60 }),

    'Form Pattern': generateASCIIWireframe({
      title: 'Contact Form',
      fields: [
        { label: 'Name', placeholder: 'John Doe' },
        { label: 'Email', placeholder: 'john@example.com' },
        { label: 'Message', placeholder: 'Your message...' }
      ]
    }, { type: 'form', width: 45 }),

    'Data Table Pattern': generateASCIIWireframe({
      headers: ['Product', 'Price', 'Stock'],
      rows: [
        ['Widget A', '$29.99', 'In Stock'],
        ['Widget B', '$39.99', 'Low Stock'],
        ['Widget C', '$49.99', 'Out of Stock']
      ]
    }, { type: 'table' })
  };

  Object.entries(patterns).forEach(([name, pattern]) => {
    console.log(`\n${name}:`);
    console.log(pattern);
  });

  return patterns;
}

/**
 * Example 4: Rapid Prototyping Workflow
 * Quick iteration on UI designs
 */
export function rapidPrototyping(iterations = 3) {
  console.log('\n=== Rapid Prototyping Workflow ===\n');

  const prototypes = [];

  for (let i = 1; i <= iterations; i++) {
    console.log(`\nIteration ${i}:`);

    const prototype = generateASCIIWireframe({
      navbar: {
        items: i === 1 ? ['Home', 'About'] : ['Home', 'Products', 'About', 'Contact']
      },
      sidebar: {
        items: i === 1 ? ['Dashboard'] : ['Dashboard', 'Settings', 'Profile']
      },
      stats: Array.from({ length: i + 1 }, (_, idx) => ({
        title: `Metric ${idx + 1}`,
        value: Math.floor(Math.random() * 1000)
      }))
    }, {
      type: 'dashboard',
      width: 60
    });

    console.log(prototype);
    prototypes.push(prototype);
  }

  return prototypes;
}

/**
 * Example 5: Component Extraction for Code Generation
 * Extract components and generate code stubs
 */
export function extractAndGenerateCode(wireframe) {
  console.log('\n=== Component Extraction → Code Generation ===\n');

  // Create a sample wireframe
  const sampleWireframe = wireframe || generateASCIIWireframe({
    navbar: {
      items: ['Dashboard', 'Settings']
    },
    sidebar: {
      items: ['Menu 1', 'Menu 2']
    },
    stats: [
      { title: 'Users', value: '142' }
    ]
  }, { type: 'dashboard', width: 60 });

  console.log('Original Wireframe:');
  console.log(sampleWireframe);

  // Extract components
  const components = extractComponentList(sampleWireframe);
  console.log('\nExtracted Components:');
  console.log(components);

  // Generate React component stubs
  console.log('\nGenerated React Components:');
  components.forEach(comp => {
    if (comp && comp.length > 2) {
      const componentName = comp.replace(/\s+/g, '');
      console.log(`\n// ${componentName}.tsx`);
      console.log(`export function ${componentName}() {`);
      console.log(`  return (`);
      console.log(`    <div className="${componentName.toLowerCase()}">`);
      console.log(`      {/* ${comp} implementation */}`);
      console.log(`    </div>`);
      console.log(`  );`);
      console.log(`}`);
    }
  });

  return { wireframe: sampleWireframe, components };
}

/**
 * Example 6: User Story → Wireframe
 * Convert user story requirements into visual wireframe
 */
export function userStoryToWireframe(userStory) {
  console.log('\n=== User Story → Wireframe ===\n');

  const story = userStory || {
    title: 'User Dashboard View',
    as: 'logged-in user',
    want: 'view my activity dashboard',
    so: 'I can see my recent activity and key metrics',
    acceptance: [
      'Navigation bar with logout option',
      'Sidebar with main menu items',
      'Stats cards showing key metrics',
      'Welcome message with user name'
    ]
  };

  console.log('User Story:');
  console.log(`Title: ${story.title}`);
  console.log(`As a ${story.as}`);
  console.log(`I want to ${story.want}`);
  console.log(`So that ${story.so}`);
  console.log('\nAcceptance Criteria:');
  story.acceptance.forEach((ac, i) => console.log(`${i + 1}. ${ac}`));

  // Generate wireframe based on story
  const wireframe = generateASCIIWireframe({
    navbar: {
      items: ['Dashboard', 'Profile', 'Logout']
    },
    sidebar: {
      items: ['Dashboard', 'Activity', 'Settings']
    },
    stats: [
      { title: 'Active Tasks', value: '8' },
      { title: 'Completed', value: '24' },
      { title: 'Pending', value: '3' }
    ]
  }, {
    type: 'dashboard',
    width: 65
  });

  console.log('\nGenerated Wireframe:');
  console.log(wireframe);

  return { story, wireframe };
}

/**
 * Main demonstration function
 */
export function runVisionIntegrationDemo() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Vision Mode ASCII UI Generator Demo          ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Run all examples
  screenshotToWireframe();
  generateComponentLibrary();
  generateDesignSystemDocs();
  rapidPrototyping(2);
  extractAndGenerateCode();
  userStoryToWireframe();

  console.log('\n=== Demo Complete ===\n');
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVisionIntegrationDemo();
}
