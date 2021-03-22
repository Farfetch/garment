declare module '@storybook/react/standalone' {
  export = standalone;

  interface DevModeOptions {
    mode: 'dev';
    port?: number;
    host?: string;
    staticDir?: string;
    configDir?: string;
    https?: boolean;
    sslCa?: string;
    sslCert?: string;
    sslKey?: string;
    smokeTest?: boolean;
    ci?: boolean;
    quiet?: boolean;
  }

  interface StaticModeOptions {
    mode: 'static';
    staticDir?: string;
    outputDir?: string;
    configDir?: string;
    watch?: boolean;
    quiet?: boolean;
  }

  function standalone(
    options: DevModeOptions | StaticModeOptions
  ): Promise<void>;
}
