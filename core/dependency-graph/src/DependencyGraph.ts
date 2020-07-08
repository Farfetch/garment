function createGraphWalker<T>(
  edges: Map<T, Set<T>>,
  options: { includeInitialNode?: boolean } = {}
) {
  const { includeInitialNode } = options;

  const result = new Set<T>();
  const currentPath = new Set<T>();
  const initialNodes = new Set();

  function graphWalker(node: T, depth = 0) {
    currentPath.add(node);

    if (depth === 0) {
      initialNodes.add(node);
    }
    if (result.has(node)) {
      result.delete(node);
    }
    if (!initialNodes.has(node) || includeInitialNode) {
      result.add(node);
    }

    const nodeEdges = edges.get(node);
    if (nodeEdges) {
      for (const nodeEdge of nodeEdges.values()) {
        if (!currentPath.has(nodeEdge)) {
          graphWalker(nodeEdge, depth + 1);
        } else {
          throw new Error(
            'Graph contains circular dependency: ' +
              [...currentPath, nodeEdge].join(' -> ')
          );
        }
      }
      currentPath.delete(node);
    }
  }

  return (...nodes: T[]) => {
    for (const node of nodes) {
      graphWalker(node);
    }
    return result;
  };
}

function arrayfy<T>(arr: T | T[]) {
  return Array.isArray(arr) ? arr : [arr];
}

export class Graph<T = string> {
  private nodes = new Set<T>();
  private outEdges = new Map<T, Set<T>>();
  private inEdges = new Map<T, Set<T>>();

  [Symbol.iterator]() {
    return this.nodes[Symbol.iterator]();
  }

  get size() {
    return this.nodes.size;
  }

  addNode(...nodes: T[]) {
    for (const node of nodes) {
      if (!this.nodes.has(node)) {
        this.nodes.add(node);
        this.outEdges.set(node, new Set());
        this.inEdges.set(node, new Set());
      }
    }
  }

  removeNode(...nodes: T[]) {
    for (const node of nodes) {
      if (this.nodes.has(node)) {
        this.nodes.delete(node);
        this.inEdges.delete(node);
        this.outEdges.delete(node);
        [...this.inEdges.values(), ...this.outEdges.values()].forEach(edges => {
          if (edges.has(node)) {
            edges.delete(node);
          }
        });
      }
    }
  }

  hasNode(node: T) {
    return this.nodes.has(node);
  }

  addDependency(from: T, to: T) {
    if (from === to) {
      throw new Error(`Node can't be dependant on itself: ${from}`);
    }
    if (!this.hasNode(from)) {
      throw new Error('Node does not exist: ' + from);
    }
    if (!this.hasNode(to)) {
      throw new Error('Node does not exist: ' + to);
    }
    const outEdges = this.outEdges.get(from);
    const inEdges = this.inEdges.get(to);
    if (!outEdges || !inEdges) {
      return;
    }

    if (!outEdges.has(to)) {
      outEdges.add(to);
    }
    if (!inEdges.has(from)) {
      inEdges.add(from);
    }
  }

  removeDependency(from: T, to: T) {
    if (!this.hasNode(from)) {
      throw new Error('Node does not exist: ' + from);
    }
    if (!this.hasNode(to)) {
      throw new Error('Node does not exist: ' + to);
    }

    const outEdges = this.outEdges.get(from);
    const inEdges = this.inEdges.get(to);
    if (!outEdges || !inEdges) {
      return;
    }

    if (outEdges.has(to)) {
      outEdges.delete(to);
    }
    if (inEdges.has(from)) {
      inEdges.delete(from);
    }
  }

  getDependenciesOf(...nodes: T[]) {
    const walk = createGraphWalker(this.outEdges);
    return Array.from(walk(...nodes));
  }

  getDirectDependenciesOf(node: T) {
    return Array.from(this.outEdges.get(node) || []);
  }

  getDependantsOf(...nodes: T[]) {
    const walk = createGraphWalker(this.inEdges);
    return Array.from(walk(...nodes));
  }

  getDirectDependantsOf(node: T) {
    return Array.from(this.inEdges.get(node) || []);
  }

  getNodesWithoutDependants() {
    const nodes = new Set<T>();
    for (const [node, egdes] of this.inEdges) {
      if (egdes.size === 0) {
        nodes.add(node);
      }
    }
    return Array.from(nodes);
  }

  getLeafNodes() {
    const nodes = new Set<T>();
    for (const [node, egdes] of this.outEdges) {
      if (egdes.size === 0) {
        nodes.add(node);
      }
    }
    return Array.from(nodes);
  }

  getOverallOrder() {
    return this.sort([...this.nodes]);
  }

  sort(nodes: T[]) {
    const walk = createGraphWalker(this.outEdges, { includeInitialNode: true });
    return Array.from(walk(...nodes))
      .filter(node => nodes.includes(node))
      .reverse();
  }

  map<O>(fn: (node: T) => O | O[]): Graph<O> {
    const graph = new Graph<O>();

    const nodeMapping = new Map<T, O[]>();
    const mapNode = (node: T) => nodeMapping.get(node)!;
    const setify = <P>(arr: P[][]) =>
      arr.reduce(
        (result, item) => (item.forEach(i => result.add(i)), result),
        new Set<P>()
      );

    for (const node of this.nodes) {
      const mapped = arrayfy(fn(node));
      nodeMapping.set(node, mapped);
      mapped.forEach(node => graph.nodes.add(node));
    }
    for (const [key, nodeSet] of this.inEdges) {
      mapNode(key).forEach(keyNode => {
        graph.inEdges.set(keyNode, setify([...nodeSet].map(mapNode)));
      });
    }
    for (const [key, nodeSet] of this.outEdges) {
      mapNode(key).forEach(keyNode => {
        graph.outEdges.set(keyNode, setify([...nodeSet].map(mapNode)));
      });
    }

    return graph;
  }

  filter(fn: (node: T) => boolean): Graph<T> {
    const graph = new Graph<T>();

    const shouldInclude = new Set<T>();

    for (const node of this) {
      if (fn(node)) {
        shouldInclude.add(node);
        graph.nodes.add(node);
      }
    }

    for (const [key, inNodes] of this.inEdges) {
      if (shouldInclude.has(key)) {
        graph.inEdges.set(
          key,
          new Set(
            Array.from(inNodes).filter(inNode => shouldInclude.has(inNode))
          )
        );
      }
    }

    for (const [key, outNodes] of this.outEdges) {
      if (shouldInclude.has(key)) {
        graph.outEdges.set(
          key,
          new Set(
            Array.from(outNodes).filter(outNode => shouldInclude.has(outNode))
          )
        );
      }
    }

    return graph;
  }

  clone() {
    const clone = new Graph<T>();
    for (const node of this.nodes) {
      clone.nodes.add(node);
    }
    for (const [key, value] of this.inEdges) {
      clone.inEdges.set(key, new Set([...value]));
    }
    for (const [key, value] of this.outEdges) {
      clone.outEdges.set(key, new Set([...value]));
    }
    return clone;
  }

  assign(...graphs: Graph<T>[]) {
    for (const graph of graphs) {
      for (const node of graph) {
        this.addNode(node);
      }
      for (const [key, nodes] of graph.inEdges) {
        this.inEdges.set(key, new Set(nodes));
      }
      for (const [key, nodes] of graph.outEdges) {
        this.outEdges.set(key, new Set(nodes));
      }
    }
  }

  getIndependentSubgraphs(): Graph<T>[] {
    const sets: Set<T>[] = [];

    const topNodes = this.getNodesWithoutDependants();
    for (const topNode of topNodes) {
      const deps = [topNode, ...this.getDependenciesOf(topNode)];
      if (sets.length) {
        let addedToExisting = false;
        for (const nodeSet of sets) {
          if (deps.some(node => nodeSet.has(node))) {
            deps.forEach(node => nodeSet.add(node));
            addedToExisting = true;
            break;
          }
        }
        if (!addedToExisting) {
          sets.push(new Set(deps));
        }
      } else {
        sets.push(new Set(deps));
      }
    }
    return sets.map(nodeSet => this.filter(node => nodeSet.has(node)));
  }

  async traverseParallel(
    cb: (node: T) => Promise<void> | void,
    limit = Infinity
  ) {
    const cloned = this.clone();

    await new Promise((resolve, reject) => {
      const inProgress = new Set<T>();
      let shouldStop = false;
      const iterate = () => {
        const leafNodes = shouldStop ? [] : cloned.getLeafNodes();
        if (!leafNodes.length && !inProgress.size) {
          return shouldStop ? reject() : resolve();
        }
        const nodesToExecute = [...leafNodes]
          .filter(node => !inProgress.has(node))
          .slice(0, limit - inProgress.size);
        if (nodesToExecute.length) {
          nodesToExecute.forEach(async node => {
            inProgress.add(node);

            try {
              await cb(node);

              cloned.removeNode(node);
            } catch (error) {
              shouldStop = true;
            }

            inProgress.delete(node);

            iterate();
          });
        }
      };
      iterate();
    });
  }

  cleanUnnecessaryDependencies() {
    for (const node of this) {
      const directDependencies = new Set(this.getDirectDependenciesOf(node));
      if (directDependencies.size) {
        directDependencies.forEach(directDependency => {
          const indirectDependencies = this.getDependenciesOf(directDependency);
          indirectDependencies.forEach(indirectDepNode => {
            if (directDependencies.has(indirectDepNode)) {
              this.removeDependency(node, indirectDepNode);
              directDependencies.delete(indirectDepNode);
            }
          });
        });
      }
    }
  }

  toString() {
    return this.getOverallOrder().join(', ');
  }
}
