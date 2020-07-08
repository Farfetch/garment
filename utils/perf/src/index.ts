import { performance, PerformanceObserver } from 'perf_hooks';
import log from '@garment/logger';

interface Measure {
  name: string;
  duration: number;
}

const perfLog = log.createChild('perf', 'orange');

const marks: { [name: string]: string } = {};
const allMeasures: Measure[] = [];

const config = {
  print: false,
  filter: (_measure: Measure) => true
};

const performanceObserver = new PerformanceObserver(items => {
  const measures = items
    .getEntries()
    .map(({ name, duration }) => ({ name, duration }))
    .filter(config.filter);
  if (config.print) {
    printMeasures(measures);
  }
  allMeasures.push(...measures);
});
performanceObserver.observe({ entryTypes: ['measure'] });

export function mark(name: string, description = name) {
  if (marks[name]) {
    throw new Error(`Perf mark "${name}" already exists`);
  } else {
    marks[name] = description;
    performance.mark(name);
  }
}

mark.end = function markEnd(name: string) {
  if (marks[name]) {
    const markB = name + '_B';
    performance.mark(markB);
    performance.measure(marks[name], name, markB);
    delete marks[name];
  } else {
    throw new Error(`Can't place end mark, mark "${name}" doesn't exists`);
  }
};

mark.scope = function markScope(scope: string) {
  function scopedMark(name: string, description = name) {
    return mark(`${scope}:${name}`, `${scope}: ${description}`);
  }
  scopedMark.end = (name: string) => {
    return mark.end(`${scope}:${name}`);
  };
  return scopedMark;
};

export function getAllMeasures() {
  return allMeasures;
}

export function setConfig(cfg: Partial<typeof config>) {
  const oldPrint = config.print;
  Object.assign(config, cfg);

  if (oldPrint === false && cfg.print === true && allMeasures.length) {
    printMeasures(allMeasures.filter(config.filter));
  }
}

function printMeasures(measures: typeof allMeasures) {
  measures.forEach(measure =>
    perfLog.info(`"${measure.name}" took ${measure.duration}ms`)
  );
}
