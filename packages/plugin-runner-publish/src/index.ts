import { defineOptionsFromJSONSchema, defineRunner } from '@garment/runner';
import * as execa from 'execa';
import * as packument from 'packument';

function pack(name: string) {
  return new Promise<packument.Result>((resolve, reject) => {
    packument(name, (err, result) => {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
}

/**
 * Packs and publishes packages
 * @example {
    "runner": "publish"
  }
 */
export interface PublishRunnerOptions {
  /**
   * The npm config file to use
   * @format path
   */
  npmrc?: string;

  /**
   * Output error instead of warning in case of package was already published
   */
  errorIfPublished?: boolean;

  /**
   * Tag to use
   */
  tag?: string;

  /**
   * Access
   */
  access?: string;
}

export default defineRunner(
  defineOptionsFromJSONSchema<PublishRunnerOptions>(require('./schema.json')),
  async function (ctx) {
    const { project, logger } = ctx;
    const { npmrc, errorIfPublished, tag = 'latest', access } = ctx.options;

    if (!project.nodePackage) {
      logger.warn(
        `Project "${project.name}" is not a Node package and can't be published`
      );
      return;
    }

    const { name, version, private: isPrivate } = project.nodePackage;

    if (isPrivate) {
      logger.warn(`Package "${name}" is private. Publishing skipped`);
      return;
    }

    let result: packument.Result | undefined;
    try {
      result = await pack(name);
    } catch (error) {}

    if (result && result.versions[version]) {
      const msg = `Package "${name}" is already published`;
      errorIfPublished ? logger.error(msg) : logger.warn(msg);
      return;
    }

    logger.info(`Package "${name}" publishing version "${version}"`);

    const args = ['publish'];

    if (npmrc) {
      args.push('--userconfig', npmrc);
    }
    if (access) {
      args.push('--access', access);
    }
    args.push('--tag', tag);

    try {
      await execa('npm', args, {
        cwd: project.fullPath,
      });
      logger.success(
        `Package "${name}" version "${version}" published successfully`
      );
    } catch (result) {
      logger.error(result.stderr);
    }
  }
);
