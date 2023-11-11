import { Router } from 'itty-router';
import { handleProxyRequest,getClientSideUrlRewriteScript } from './reverseProxyModule.js';

const router = Router();

// Custom override routes
router.get('/api', ({}, env) => new Response('Hello World from API! - ' + env.REVERSE_PROXY_SOURCE, {
    headers: { 'content-type': 'text/plain' },
}));
router.get('/api/:id', ({ params }) => new Response(`Hello World from API ${params.id}!`, {
	headers: { 'content-type': 'text/plain' },
}));

// Host it's own url rewrite script... disable if not needed
router.get('/src/urlRewrite.js', (request, env) => {
    const currentHost = new URL(request.url).hostname;
    const rewriteScript = getClientSideUrlRewriteScript([
        { from: env.REVERSE_PROXY_SOURCE + "/l/", to: `https://${currentHost}/l/` }
    ]);
    return new Response(rewriteScript, {
        headers: { 'content-type': 'application/javascript' },
    });
});

// Reverse Proxy configuration
router.all('*', (request, env) => {
    const url = new URL(request.url);
    const targetUrl = env.REVERSE_PROXY_SOURCE + url.pathname + url.search;
    return handleProxyRequest(request, targetUrl, {
        trustedScriptSrc: [
            "src.vwgame.dev",
        ],
		trustedStyleSrc: [
			"src.vwgame.dev"
		],
		scriptSrc: [
			{src: `https://${url.hostname}/src/urlRewrite.js`, target: "body"}
		],
        styleSrc: [
            {src: "https://src.vwgame.dev/shop/css/style.css", target: "head"}
        ],
        htmlInjection: [
            {selector: "body", position: "outside-after", content: "<h1>Injected HTML</h1>"},
            {selector: "body", position: "inside-before", content: "<h1>Injected HTML</h1>"},
            {selector: "body", position: "outside-after", content: "<h1>Injected HTML ONLY ON POSTS</h1>", routes: ["/posts"]},
            {selector: "body", position: "inside-before", content: "<h1>Injected HTML ONLY ON SINGLE POST</h1>", routes: ["/p/*"], excludeStatusCode: [404]},
            {selector: "body", position: "inside-before", content: "<h1>This single post has a 404</h1>", routes: ["/p/*"], includeStatusCode: [404]},
        ],
		clientsideUrlRewrite: true
    });
});

// Cloudflare Worker entrypoint
export default {
    async fetch(request, env, ctx) {
        return router.handle(request, env);
    },
};
