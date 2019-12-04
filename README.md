# sp-rest-proxy - SharePoint REST API Proxy for local Front-end development tool-chains

> Allows performing API calls to local Express application with forwarding the queries to a remote SharePoint instance.

Original concept of the proxy was created to show how it could be easy to implements real world data communications for SharePoint Framework local serve mode during web parts debug without deployment to SharePoint tenant. Now the tool is used with multiple teams for modern front-end solutions [rapid development](https://github.com/koltyakov/sp-rest-proxy#development-paradigms).
This is a fork from the original repository [sp-rest-proxy](https://github.com/koltyakov/sp-rest-proxy). 
Where un-needed functionality has been removed, and some customization has been made to better work with FMV sharepoint projects. 

## Supports SPFx and PnP JS

## Supported SharePoint versions

- SharePoint On-Prem (2019/2016/2013/2010)

## Development paradigms

- SPA development ([Angular](http://johnliu.net/blog/2017/9/angular-4-sharepoint-on-premises-localhost-development-and-sp-rest-proxy), [React](https://www.linkedin.com/pulse/getting-started-react-local-development-sharepoint-andrew-koltyakov/), Vue.js, etc.) in serve mode against real data for On-Prem and Online
- [SharePoint Framework with local workbench](https://www.linkedin.com/pulse/local-spfx-workbench-against-real-sharepoint-api-andrew-koltyakov/)
- [SharePoint AddIns development](https://github.com/koltyakov/sp-rest-proxy/issues/41)

## Supports proxying

- REST API
- CSOM requests
- SOAP web services
- Static resources

## Proxy modes

- API Proxy server
- Socket gateway server
- Socket gateway client
- Custom Express apps embed mode

Socket proxying allows to forward API from behind NAT (experimental).

## How to use as a module

1\. Add to package.json project:

```bash
npm install concurrently --save-dev 
```

2\. Create proxyserver.js with the following code:

```javascript
const RestProxy = require('sp-rest-proxy');

const settings = {
  configPath: './config/private.json', // Location for SharePoint instance mapping and credentials
  port: 8080,                          // Local server port
  staticRoot: './static'               // Root folder for static content
};

const restProxy = new RestProxy(settings);
restProxy.serve();
```

[Configuration parameters cheatsheet](https://github.com/koltyakov/sp-rest-proxy/tree/master/docs/authparameters.md)

3\. Add npm scripts for start proxy & developmnt-server into package.json:

```json
"scripts": {
  "proxy": "node ./proxyserver.js",
  "startServers": "concurrently --kill-others \"npm run proxy\" \"npm run start\""
}
```
Script names can be as one wish. `npm run start` stands for react app serve.
`node ./api-server.js` starts sp-rest-proxy server.
`concurrently` - helps running multiple npm tasks in one command and terminal window

Check if the path to proxyserver.js is correct.

4\. Run `npm run proxy`.

5\. Provide SharePoint configuration parameters.

6\. Test local API proxy in action.
Check if credentials are correct by navigating to `http://localhost:8080`.
On success, some data should be responded from SharePoint API.
Stop sp-rest-proxy, Ctrl+C in a console.

7\. Add npm task proxy into package.json:
```json
  "proxy": "http://localhost:8080",
```
This is the address which corresponds to sp-rest-proxy startup settings.
Proxy setting is a Webpack serve feature which transfers localhost request to the sp-rest-proxy.

8\. Add config/private.json to .gitignore
Add config/private.json to .gitignore to avoid unnecessary saving of the private options to a git repository.
`config/**/private.*`

9\. Start local development serve. Happy coding!
`npm run startServers`

## Webpack Dev Server

```javascript
/* webpack.config.js */
const RestProxy = require('sp-rest-proxy');

const port = process.env.WEBPACK_DEV_SERVER_PORT || 9090;

module.exports = {
  // Common Webpack settings
  // ...
  devServer: {
    watchContentBase: true,
    writeToDisk: true,
    port,
    before: (app) => {
      // Register SP API Proxy
      new RestProxy({ port }, app).serveProxy();

      // Other routes
      // ...
    }
  }
};
```

## TypeScript support

In early days of `sp-rest-proxy`, the library was written in ES6 and used `module.exports` which was kept after migrating to TypeScript later on for the backward compatibility reasons.

In TypeScript, it's better to import the lib from `sp-rest-proxy/dist/RestProxy` to get advantages of types:

```typescript
import RestProxy, { IProxySettings } from 'sp-rest-proxy/dist/RestProxy';

const settings: IProxySettings = {
  configPath: './config/private.json'
};

const restProxy = new RestProxy(settings);
restProxy.serve();
```

## Authentication settings

The proxy provides wizard-like approach for building and managing config files for [sp-auth](https://git.haxakon.se/fmv/sp-auth) (Node.js to SharePoint unattended http authentication).

- SharePoint 2019, 2016, 2013:
  - Form-based authentication (Forefront TMG)

Auth settings are stored inside `./config/private.json`.

## License
The MIT License (MIT)

Copyright (c) 2016-2018 Andrew Koltyakov
