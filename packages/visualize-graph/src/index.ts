import { Graph } from '@garment/dependency-graph';
import * as fs from 'fs-extra';

const { tmpNameSync } = require('tmp');
const opn = require('opn');
const graphviz = require('graphviz');
const Viz = require('viz.js');
let { Module, render } = require('viz.js/full.render.js');

const defaultStyle = {
  fontname: 'Arial',
  fontsize: 10,
  fontcolor: 'black',
  style: 'filled',
  fillcolor: '#EFEFEF'
};

export async function vizualizeGraph<T extends object>(
  dependencyGraph: Graph<T> | Graph<T>[],
  options: {
    getNodeContent?(node: T): string;
    getNodeStyle?(node: T, def: Partial<typeof defaultStyle>): any;
  } = {}
) {
  const {
    getNodeStyle = () => defaultStyle,
    getNodeContent = (node: T) => node.toString()
  } = options;

  try {
    const results = await Promise.all(
      arrayfy(dependencyGraph).map(depGraph => {
        let viz = new Viz({ Module, render });

        const g = graphviz.digraph('G');

        const graphvizConfig = {
          graph: [
            {
              attr: 'splines',
              value: 'ortho'
            },
            {
              attr: 'overlap',
              value: false
            },
            {
              attr: 'pad',
              value: 1
            }
          ]
        };

        graphvizConfig.graph.forEach(({ attr, value }) => g.set(attr, value));

        const nodes = depGraph.getNodesWithoutDependants();

        const checklist = new Set();

        const findDependencies = (node: any) => {
          const currentNode = g.addNode(
            getNodeContent(node),
            getNodeStyle(node, defaultStyle)
          );
          checklist.add(node);
          depGraph.getDirectDependenciesOf(node).forEach(dep => {
            if (node === dep) return;
            const depNode = g.addNode(
              getNodeContent(dep),
              getNodeStyle(dep, defaultStyle)
            );
            g.addEdge(currentNode, depNode);
            if (!checklist.has(dep)) {
              findDependencies(dep);
            }
          });
        };

        nodes.forEach(node => {
          findDependencies(node);
        });

        return viz.renderString(g.to_dot());
      })
    );

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Graph</title>
    </head>
    <body>
        ${results.map(_ => `<div>${_}</div>`).join('\n')}
    </body>
    </html>
    `;

    const tmpFilename = `${tmpNameSync()}.html`;
    fs.writeFileSync(tmpFilename, htmlContent);
    opn(tmpFilename, {
      wait: false
    });
  } catch (error) {
    throw new Error(error);
  }
}

function arrayfy<T>(arr: T | T[]) {
  return Array.isArray(arr) ? arr : [arr];
}
