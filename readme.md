# 💉 Cloudflare Reverse Proxy Worker

The `handleProxyRequest` function provides the main functionality of the reverse proxy system. It receives an incoming request and forwards it to a target URL. Various adjustments are made to process the request and return the response to the client.

Originally, this Cloudflare reverse proxy was developed for customising third-party hosted shop pages, but as it is extremely flexible, it can also be used for any other purpose. Special focus is placed on the manipulation of CSP headers to enable the integration of external resources and to prevent the blocking of external resources as well as the precise injection of HTML content into the page.

In addition, it was important during development that it will be possible to overwrite specific routes and thus define new routes.

## 📦 Installation
It is recommended to use Cloudflare Wrangler to deploy the worker. The Git repository can then be cloned and the `wrangler.toml` file customised. The `wrangler.toml` file contains the configuration for the reverse proxy. The settings for the worker can be customised here. The `wrangler.toml` file should look like this:

```toml
name = "reverse-proxy"
main = "src/index.js"
compatibility_date = "2023-11-10"
[limits]
cpu_ms = 5

[vars]
REVERSE_PROXY_SOURCE = "https://zielseite.de"
REVERSE_PROXY_TARGET = "https://neueseite.de"
```


# 📚 Documentation

## ⚗️ ```handleProxyRequest(request, targetUrl, config)```
### 🎛️ Parameter
1. `request`: This is the request object that contains all the information about the incoming request.
2. `targetUrl`: This is the URL to which the request is to be forwarded.
3. `config`: This is an optional configuration object that contains various settings for handling the request. If no configuration object is provided, an empty object is used.

### 🛠️ Configuration object

The configuration object can contain various properties to adjust the behaviour of the `handleProxyRequest` function. Here are some examples:

- `trustedScriptSrc`: An array of URLs that are considered trusted sources for scripts.

- `trustedStyleSrc`: An array of URLs that are considered trusted sources for stylesheets.

- `scriptSrc`: An array of objects containing information about scripts to be inserted into the page. Each object should contain the properties `src` (the URL of the script) and `target` (the location where the script should be inserted).

- `styleSrc`: An array of objects containing information about stylesheets to be inserted into the page. Each object should contain the properties `rc` (the URL of the stylesheet) and `target` (the location where the stylesheet should be inserted).

- `htmlInjection`: An array of objects containing information about HTML content to be inserted into the page. Each object should contain the properties `selector`, `position`, `content`, `routes`, `excludeStatusCode` and `includeStatusCode`.

- `clientsideUrlRewrite`: A Boolean value that specifies whether the URL should be rewritten on the client side or not.

### 🔭be Application example

```javascript
router.all('*', (request, env) => {
    const url = new URL(request.url);
    const targetUrl = env.REVERSE_PROXY_SOURCE + url.pathname + url.search;
    return handleProxyRequest(request, targetUrl, {
        trustedScriptSrc: [
            "src.trusted-domain.com"
        ],
        trustedStyleSrc: [
            "src.trusted-domain.com",
            "fonts.googleapis.com"
        ],
        scriptSrc:
        [
            {src: `https://${url.hostname}/src/urlRewrite.js`, target: "body"}
        ],
        styleSrc:
        [
            {src: "https://src.trusted-domain.com/css/style.css", target: "head"}
        ],
        htmlInjection:
        [
            {selector: "body", position: "outside-after", content: "<h1>Injected HTML</h1>"},
            {selector: "body", position: "inside-before", content: "<h1>Injected HTML</h1>"},
            {selector: "body", position: "outside-after", content: "<h1>Injected HTML ONLY ON POSTS</h1>", routes: ["/posts"]},
            {selector: "body", position: "inside-before", content: "<h1>Injected HTML ONLY ON SINGLE POST</h1>", routes: ["/p/*"], excludeStatusCode: [404]},
            {selector: "body", position: "inside-before", content: "<h1>This single post has a 404</h1>", routes: ["/p/*"], includeStatusCode: [404]},
        ],
        clientsideUrlRewrite: true
    });
});
```
>In this example, the `handleProxyRequest` function is used to handle all incoming requests and forward them to a specific target URL. Various configuration options are used to adjust the behaviour of the function. The index.js file already contains an example configuration.

## 🛟 ```getClientSideUrlRewriteScript(valuePairs = [])```
### 📖 Description
In the case of the original use I thought of, it was necessary to rewrite client-side generated links. Since our reverse-proxy target is a React app, some links are only generated at runtime. This function can be used to generate a JavaScript that contains a list of ```from``` -> ```to``` value pairs. To use this JavaScript, it is possible to provide it yourself via a custom route. An example of such an application could look like this:
```javascript
router.get('/src/urlRewrite.js', (request, env) => {
    const currentHost = new URL(request.url).hostname;
    const rewriteScript = getClientSideUrlRewriteScript([
        { from: env.REVERSE_PROXY_SOURCE + "/l/", to: `https://${currentHost}/l/` },
        //...
    ]);
    return new Response(rewriteScript, {
        headers: { 'content-type': 'application/javascript' },
    });
});
```
> In this example, the `getClientSideUrlRewriteScript` function is used to generate a JavaScript that contains a list of ```from``` -> ```to``` value pairs. This JavaScript is then provided via a custom route.
### 🎛️ Parameter
- ``valuePairs``: This is an array of objects containing information about the URL rewrite. Each object should contain the properties `from` (the URL to be replaced) and `to` (the URL to replace the original URL).

# 🌤️ Cloudflare protection of target URLs and CNAMEs
Many sites legitimately block Cloudflare from accessing their pages via a reverse proxy. However, if these providers allow us to use a custom domain via CNAME, we can use a workaround that allows us to reach the site via a reverse proxy. All we have to do is set up a subdomain that points to the target URL as CNAME. We can then use this subdomain as the target URL. In some cases, this is possible because the respective provider protects its own domains from reverse proxy requests, but our custom domains are not subject to any specific protection measures. An example of such a configuration could look like this:
```
username.example.com <-[CNAME]-> temp.ourdomain.com <-[reverse proxy]-> ourdomain.com
```


# 📜 Licence
This project has been developed by [@VWGameDev](https://vwgame.dev) and is published under the [MIT licence](license.md).
# ⚠️ Disclaimer
I assume no liability for any damages that may result from the use of this project and provide this project without warranty of any kind. I also expressly point out that the use of reverse proxies should only be done with the permission of the operator of the target URLs. Furthermore, I do not guarantee the functionality, security or reliability of this project. However, I am happy to receive any feedback and pull requests.