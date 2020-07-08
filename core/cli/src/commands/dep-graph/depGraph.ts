import { dependencyGraphFromWorkspace } from '@garment/garment';
import { vizualizeGraph } from '@garment/visualize-graph';
import { createWorkspace } from '../../utils/createWorkspace';

export async function run() {
  const workspace = await createWorkspace();
  const dependencyGraph = dependencyGraphFromWorkspace(workspace);

  dependencyGraph.cleanUnnecessaryDependencies();

  vizualizeGraph(dependencyGraph, { getNodeContent: node => node.name });
}
