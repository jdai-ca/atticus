import { app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import { createLogger } from '../../services/debugLogger';

const logger = createLogger('BundledConfigHandlers');

export function registerBundledConfigHandlers(isDev: boolean, electronDir: string): void {
  // Load bundled config file (providers.yaml or practices.yaml)
  ipcMain.handle('load-bundled-config', async (_event, configName: string) => {
    try {
      // Security: Allowlist of valid config files (now includes language suffixes)
      const ALLOWED_BASE_CONFIGS = ['providers', 'practices', 'advisory', 'analysis'];

      // Parse filename to check if it's valid (e.g., "analysis.en.yaml", "providers.fr.yaml", or "providers.yaml")
      const match = configName.match(/^([a-z-]+)(?:\.(en|fr|es))?\.yaml$/);
      if (!match) {
        throw new Error(`Invalid config file format: ${configName}`);
      }

      const [, baseConfig] = match;
      if (!ALLOWED_BASE_CONFIGS.includes(baseConfig)) {
        throw new Error(`Invalid config file requested: ${configName}`);
      }

      // In production, config files are in dist/config/ relative to the app
      let configPath: string;

      if (isDev) {
        // In development, files are in public/config/
        configPath = path.join(electronDir, '..', 'public', 'config', configName);
      } else {
        // In production, first check userData/config/ for user customizations
        const userDataPath = app.getPath('userData');
        const userConfigPath = path.join(userDataPath, 'config', configName);

        if (fs.existsSync(userConfigPath)) {
          // User has customized this config, use their version
          configPath = userConfigPath;
          logger.info('Loading user-customized config', { configPath });
        } else {
          // No user customization, load from bundled location
          // electronDir points to dist-electron, so we go up and into dist/config
          configPath = path.join(electronDir, '..', 'dist', 'config', configName);

          // If not found, try the unpacked asar location
          if (!fs.existsSync(configPath)) {
            configPath = path.join(process.resourcesPath, 'dist', 'config', configName);
          }

          // If still not found, try app.asar.unpacked
          if (!fs.existsSync(configPath)) {
            configPath = path.join(
              process.resourcesPath,
              'app.asar.unpacked',
              'dist',
              'config',
              configName
            );
          }
        }
      }

      logger.info('Loading bundled config', { configPath });

      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }

      const data = await fs.promises.readFile(configPath, 'utf-8');
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to load bundled config', { error });
      return {
        success: false,
        error: {
          code: 'BUNDLED_CONFIG_LOAD_FAILED',
          message: 'Failed to load bundled configuration. Check logs for details.',
        },
      };
    }
  });

  // Fetch factory YAML from remote endpoint
  ipcMain.handle('fetch-factory-config', async (_event, configName: string) => {
    try {
      // Security: Allowlist of valid config files (now includes language suffixes)
      const match = configName.match(/^([a-z-]+)\.(en|fr|es)\.yaml$/);
      if (!match) {
        throw new Error(`Invalid config file format: ${configName}`);
      }

      const [, baseConfig] = match;
      const ALLOWED_BASE_CONFIGS = ['providers', 'practices', 'advisory', 'analysis'];
      if (!ALLOWED_BASE_CONFIGS.includes(baseConfig)) {
        throw new Error(`Invalid config file requested: ${configName}`);
      }

      const url = `https://jdai.ca/atticus/${configName}`;
      logger.info('Fetching factory config', { url });

      return new Promise(resolve => {
        https
          .get(url, res => {
            if (res.statusCode !== 200) {
              logger.error('Failed to fetch factory config', { statusCode: res.statusCode });
              resolve({
                success: false,
                error: {
                  code: 'FETCH_FAILED',
                  message: `Failed to fetch factory configuration (HTTP ${res.statusCode})`,
                },
              });
              return;
            }

            let data = '';
            res.on('data', chunk => {
              data += chunk;
            });

            res.on('end', () => {
              logger.info('Factory config fetched successfully', { size: data.length });
              resolve({ success: true, data });
            });
          })
          .on('error', error => {
            logger.error('Failed to fetch factory config', { error });
            resolve({
              success: false,
              error: {
                code: 'NETWORK_ERROR',
                message: `Network error: ${(error as Error).message}`,
              },
            });
          });
      });
    } catch (error) {
      logger.error('Failed to fetch factory config', { error });
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch factory configuration. Check logs for details.',
        },
      };
    }
  });

  // Save bundled config file
  ipcMain.handle('save-bundled-config', async (_event, configName: string, content: string) => {
    try {
      // Security: Allowlist of valid config files (now includes language suffixes)
      const match = configName.match(/^([a-z-]+)\.(en|fr|es)\.yaml$/);
      if (!match) {
        throw new Error(`Invalid config file format: ${configName}`);
      }

      const [, baseConfig] = match;
      const ALLOWED_BASE_CONFIGS = ['providers', 'practices', 'advisory', 'analysis'];
      if (!ALLOWED_BASE_CONFIGS.includes(baseConfig)) {
        throw new Error(`Invalid config file: ${configName}`);
      }

      // Determine the config path (same logic as load-bundled-config)
      let configPath: string;

      if (isDev) {
        // In development, save to public/config/
        configPath = path.join(electronDir, '..', 'public', 'config', configName);
      } else {
        // In production, save to a writable location in userData
        const userDataPath = app.getPath('userData');
        const userConfigDir = path.join(userDataPath, 'config');

        // Ensure directory exists
        if (!fs.existsSync(userConfigDir)) {
          await fs.promises.mkdir(userConfigDir, { recursive: true });
        }

        configPath = path.join(userConfigDir, configName);
      }

      logger.info('Saving bundled config', { configPath });

      // Write the content
      await fs.promises.writeFile(configPath, content, 'utf-8');

      return { success: true, data: { path: configPath } };
    } catch (error) {
      logger.error('Failed to save bundled config', { error });
      return {
        success: false,
        error: {
          code: 'BUNDLED_CONFIG_SAVE_FAILED',
          message: 'Failed to save configuration. Check logs for details.',
        },
      };
    }
  });
}
