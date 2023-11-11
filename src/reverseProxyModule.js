export async function handleProxyRequest(request, targetUrl, config = {}) {
    const { 
        trustedStyleSrc = [], 
        trustedScriptSrc = [], 
        trustedMediaSrc = [], 
        scriptSrc = [], 
        styleSrc = [],
        htmlInjection = [] 
    } = config;

    const proxyRequest = new Request(targetUrl, request);
    let originalResponse = await fetch(proxyRequest);

    let headers = new Headers(originalResponse.headers);

    let csp = headers.get('Content-Security-Policy');
    if (csp) {
        if (trustedStyleSrc.length > 0) {
            const styleSources = trustedStyleSrc.join(' ');
            csp = csp.replace(/style-src [^;]*/i, `$& ${styleSources}`);
        }
        if (trustedScriptSrc.length > 0) {
            const scriptSources = trustedScriptSrc.join(' ');
            csp = csp.replace(/script-src [^;]*/i, `$& ${scriptSources}`);
        }
        if (trustedMediaSrc.length > 0) {
            const mediaSources = trustedMediaSrc.join(' ');
            csp = csp.replace(/media-src [^;]*/i, `$& ${mediaSources}`);
        }

        headers.set("Content-Security-Policy", csp);
    }

    let rewriter = new HTMLRewriter();
    scriptSrc.forEach(({ src, target }) => {
        const scriptTag = `<script src="${src}"></script>`;
        rewriter.on(target, {
            element(element) {
                element.append(scriptTag, { html: true });
            }
        });
    });

    styleSrc.forEach(({ src, target }) => {
        const linkTag = `<link rel="stylesheet" href="${src}">`;
        rewriter.on(target, {
            element(element) {
                element.append(linkTag, { html: true });
            }
        });
    });

    htmlInjection.forEach(({ selector, position, content, routes = [], excludeStatusCode = [], includeStatusCode = [] }) => {
        const url = new URL(request.url);
        const currentPath = url.pathname;
        const responseStatusCode = originalResponse.status;
    
        const matchesRoute = routes.length === 0 || routes.some(routePattern => matchPattern(currentPath, routePattern));
        const matchesExcludeStatus = !excludeStatusCode.includes(responseStatusCode);
        const matchesIncludeStatus = includeStatusCode.length === 0 || includeStatusCode.includes(responseStatusCode);
    
        if (matchesRoute && matchesExcludeStatus && matchesIncludeStatus) {
            rewriter.on(selector, {
                element(element) {
                    if (position === 'inside-before') {
                        element.prepend(content, { html: true });
                    } else if (position === 'inside-after') {
                        element.append(content, { html: true });
                    } else if (position === 'outside-before') {
                        element.before(content, { html: true });
                    } else if (position === 'outside-after') {
                        element.after(content, { html: true });
                    }
                }
            });
        }
    });

    let transformedResponse = rewriter.transform(originalResponse);

    return new Response(transformedResponse.body, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: headers
    });
}

function matchPattern(path, pattern) {
    const pathSegments = path.split('/');
    const patternSegments = pattern.split('/');

    if (pathSegments.length !== patternSegments.length) {
        return false;
    }

    return pathSegments.every((segment, index) => {
        const patternSegment = patternSegments[index];
        return patternSegment === '*' || segment === patternSegment;
    });
}

// Helper function - modify this to your needs or remove it if you don't need it
export function getClientSideUrlRewriteScript(valuePairs = []) {
    const rewriteCases = valuePairs.map(pair => {
        return `if (link.href.startsWith('${pair.from}')) {
            link.href = link.href.replace('${pair.from}', '${pair.to}');
        }`;
    }).join('\n');

    return `
        (function() {
            const originalPushState = history.pushState;
            history.pushState = function(state) {
                if (typeof history.onpushstate == "function") {
                    history.onpushstate({state: state});
                }
                return originalPushState.apply(history, arguments);
            };
            window.addEventListener('popstate', function(event) {
                rewriteLinks();
            });
            document.addEventListener('DOMContentLoaded', rewriteLinks);
            function rewriteLinks() {
                const links = document.querySelectorAll('a');
                links.forEach(link => {
                    ${rewriteCases}
                });
            }
        })();
    `;
}

