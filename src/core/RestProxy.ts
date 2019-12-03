import { AuthConfig, IAuthConfigSettings } from 'node-sp-auth-config';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

import { Logger } from '../utils/logger';
import { RestGetRouter } from './routers/restGet';
import { RestPostRouter } from './routers/restPost';

import {
  IProxySettings,
  IProxyContext,
  IRouters,
  IGatewayServerSettings,
  IGatewayClientSettings,
  IProxyCallback,
  IProxyErrorCallback
} from './interfaces';

export default class RestProxy {

  private app: express.Application;
  private settings: IProxySettings;
  private routers: IRouters;
  private logger: Logger;
  private isExtApp: boolean = false;

  constructor(settings: IProxySettings = {}, app?: express.Application) {
    const authConfigSettings: IAuthConfigSettings = settings.authConfigSettings || {};

    this.settings = {
      ...settings as any,
      protocol: typeof settings.protocol !== 'undefined' ? settings.protocol : 'http',
      hostname: settings.hostname || process.env.HOSTNAME || 'localhost',
      port: settings.port || process.env.PORT || 8080,
      staticRoot: path.resolve(settings.staticRoot || path.join(__dirname, '/../../static')),
      rawBodyLimitSize: settings.rawBodyLimitSize || '10MB',
      jsonPayloadLimitSize: settings.jsonPayloadLimitSize || '2MB',
      metadata: require(path.join(__dirname, '/../../package.json')),
      strictRelativeUrls: typeof settings.strictRelativeUrls !== 'undefined' ? settings.strictRelativeUrls : false,
      agent: settings.agent || new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        keepAliveMsecs: 10000
      }),
      authConfigSettings: {
        ...authConfigSettings,
        configPath: path.resolve(authConfigSettings.configPath || settings.configPath || './config/private.json'),
        defaultConfigPath: authConfigSettings.defaultConfigPath || settings.defaultConfigPath,
        encryptPassword: typeof authConfigSettings.encryptPassword !== 'undefined' ? authConfigSettings.encryptPassword : true,
        saveConfigOnDisk: typeof authConfigSettings.saveConfigOnDisk !== 'undefined' ? authConfigSettings.saveConfigOnDisk : true
      }
    };

    this.logger = new Logger(this.settings.logLevel);

    if (typeof app !== 'undefined') {
      this.app = app;
      this.isExtApp = true;
    } else {
      this.app = express();
    }

    this.routers = {
      apiRestRouter: express.Router(),
      genericPostRouter: express.Router(),
      genericGetRouter: express.Router()
    };
  }

  // Server proxy main mode
  public serveProxy(callback?: IProxyCallback): void {
    this.serve(callback);
  }

  // Keep public for backward compatibility
  public serve(callback?: IProxyCallback, errorCallback?: IProxyErrorCallback): void {
    (async () => {

      const ctx = await new AuthConfig(this.settings.authConfigSettings).getContext();

      const context = {
        ...ctx,
        proxyHostUrl: `${this.settings.protocol}://${this.settings.hostname}:${this.settings.port}`
      } as IProxyContext;

      // REST - GET requests (JSON)
      this.routers.apiRestRouter.get(
        '/*',
        new RestGetRouter(context, this.settings).router
      );

      // REST - POST requests (JSON)
      this.routers.apiRestRouter.post(
        '/*',
        bodyParser.json({
          limit: this.settings.jsonPayloadLimitSize
        }),
        new RestPostRouter(context, this.settings).router
      );

      // Put and Patch workaround issue #59
      (() => {
        // REST - PUT requests (JSON)
        this.routers.apiRestRouter.put(
          '/*',
          bodyParser.json({
            limit: this.settings.jsonPayloadLimitSize
          }),
          new RestPostRouter(context, this.settings).router
        );

        // REST - PATCH requests (JSON)
        this.routers.apiRestRouter.patch(
          '/*',
          bodyParser.json({
            limit: this.settings.jsonPayloadLimitSize
          }),
          new RestPostRouter(context, this.settings).router
        );
      })();

      this.app.use(cors());
      this.app.use('*/_api', this.routers.apiRestRouter);

      this.app.use('/', this.routers.genericPostRouter);
      this.app.use('/', this.routers.genericGetRouter);

      // Deligate serving to external app
      if (this.isExtApp) { return; }

      const upCallback = (server: https.Server | http.Server, context: IProxyContext, settings: IProxySettings, callback?: IProxyCallback) => {
        this.logger.info(`SharePoint REST Proxy has been started on ${context.proxyHostUrl}`);
        // After proxy is started callback
        if (callback && typeof callback === 'function') {
          callback(server, context, settings);
        }
      };

      let server: http.Server | https.Server = null;
      if (this.settings.protocol === 'https') {
        if (typeof this.settings.ssl === 'undefined') {
          // console.log('Error: No SSL settings provided!');
          // return;
          this.settings.ssl = {
            cert: path.join(__dirname, './../../ssl/cert.crt'),
            key: path.join(__dirname, './../../ssl/key.pem')
          };
        }
        const options: https.ServerOptions = {
          cert: fs.existsSync(this.settings.ssl.cert) ? fs.readFileSync(this.settings.ssl.cert) : this.settings.ssl.cert,
          key: fs.existsSync(this.settings.ssl.key) ? fs.readFileSync(this.settings.ssl.key) : this.settings.ssl.key
        };
        server = https.createServer(options, this.app);
      } else {
        server = require('http').Server(this.app);
      }

      if (server) {
        server.listen(this.settings.port, this.settings.hostname, () => {
          upCallback(server, context, this.settings, callback);
        });
      }

    })().catch((error) => {
      this.logger.error(error);
      if (errorCallback) {
        errorCallback(error);
      }
    });
  }

}

export {
  IProxySettings,
  IProxyContext,
  IGatewayClientSettings,
  IGatewayServerSettings
} from './interfaces';
