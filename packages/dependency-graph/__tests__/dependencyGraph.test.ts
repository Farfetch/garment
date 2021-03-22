import { Graph } from './../src/DependencyGraph';

async function delay(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

function createGraph(connections: { [name: string]: string[] }) {
  const graph = new Graph<string>();

  for (const [key, value] of Object.entries(connections)) {
    graph.addNode(key);
    for (const dep of value) {
      if (!graph.hasNode(dep)) {
        graph.addNode(dep);
      }
      graph.addDependency(key, dep);
    }
  }

  return graph;
}

test('traverses graph parallelly', async () => {
  const graph = createGraph({
    n1: ['n2', 'n3', 'n4'],
    n2: ['n5'],
    n3: ['n5'],
    n4: ['n6']
  });
  const nodesOrder: string[] = [];

  await graph.traverseParallel(async node => {
    switch (node) {
      case 'n4':
        await delay(50);
        break;
      case 'n5':
        await delay(10);
        break;
      case 'n3':
        await delay(30);
        break;
      default:
        break;
    }
    nodesOrder.push(node);
  });

  expect(nodesOrder).toMatchSnapshot();
});

test('returns independent subgraphs', () => {
  const graph = createGraph({
    n1: ['n2', 'n3'],
    n2: ['n5'],
    n3: ['n5'],
    n4: ['n6'],
    n7: ['n4']
  });

  const subgraphs = graph.getIndependentSubgraphs();
  expect(subgraphs.map(_ => _.getOverallOrder())).toMatchSnapshot();
});

test('filters', () => {
  const graph = createGraph({
    n1: ['n2'],
    n2: ['n3']
  });

  const filtered = graph.filter(_ => _ !== 'n2');
  expect(filtered).toMatchSnapshot();
});
