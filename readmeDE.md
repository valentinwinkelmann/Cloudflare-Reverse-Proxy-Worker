# 💉 Cloudflare Reverse Proxy Worker

Die `handleProxyRequest` Funktion stellt die Hauptfunktionalität des Reverse-Proxy-Systems bereit. Sie nimmt eine eingehende Anfrage entgegen und leitet sie an eine Ziel-URL weiter. Dabei werden verschiedene Anpassungen vorgenommen, um die Anfrage zu verarbeiten und die Antwort an den Client zurückzugeben.

Ursprünglich wurde dieser Cloudflare Reverse Proxy für das anpassen von Fremd gehosteten Shopseiten entwickelt, da er aber ausgesprochen flexibel ist, kann er auch für jeden anderen zweck verwendet werden. Besonderer fokus liegt auf der Manipulation von CSP-Headern um das einbinden von externen Ressourcen zu ermöglichen und Blockierungen von externen Ressourcen zu verhindern sowie das präzise Injizieren von HTML-Inhalten in die Seite.

Zusätlich wurde bei der Entwicklung darauf wert gelegt, das es möglich sein wird gezielt routen zu überschreiben und so neue routen zu definieren.

## 📦 Installation
Es ist zu empfehlen den Cloudflare Wrangler zu verwenden, um den Worker bereitzustellen. Anschließend kann die Git-Repositorie geklont werden und die `wrangler.toml` Datei angepasst werden. Die `wrangler.toml` Datei enthält die Konfiguration für den Reverse Proxy. Hier können die Einstellungen für den Worker angepasst werden. Die `wrangler.toml` Datei sollte wie folgt aussehen:

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


# 📚 Dokumentation

## ⚗️ ```handleProxyRequest(request, targetUrl, config)```
### 🎛️ Parameter
1. `request`: Dies ist das Anfrageobjekt, das alle Informationen über die eingehende Anfrage enthält.
2. `targetUrl`: Dies ist die URL, an die die Anfrage weitergeleitet werden soll.
3. `config`: Dies ist ein optionales Konfigurationsobjekt, das verschiedene Einstellungen für die Behandlung der Anfrage enthält. Wenn kein Konfigurationsobjekt bereitgestellt wird, wird ein leeres Objekt verwendet.

### 🛠️ Konfigurationsobjekt

Das Konfigurationsobjekt kann verschiedene Eigenschaften enthalten, um das Verhalten der `handleProxyRequest` Funktion anzupassen. Hier sind einige Beispiele:

- `trustedScriptSrc`: Ein Array von URLs, die als vertrauenswürdige Quellen für Skripte betrachtet werden.

- `trustedStyleSrc`: Ein Array von URLs, die als vertrauenswürdige Quellen für Stylesheets betrachtet werden.

- `scriptSrc`: Ein Array von Objekten, die Informationen über Skripte enthalten, die in die Seite eingefügt werden sollen. Jedes Objekt sollte die Eigenschaften `src` (die URL des Skripts) und `target` (der Ort, an dem das Skript eingefügt werden soll) enthalten.

- `styleSrc`: Ein Array von Objekten, die Informationen über Stylesheets enthalten, die in die Seite eingefügt werden sollen. Jedes Objekt sollte die Eigenschaften `src` (die URL des Stylesheets) und `target` (der Ort, an dem das Stylesheet eingefügt werden soll) enthalten.

- `htmlInjection`: Ein Array von Objekten, die Informationen über HTML-Inhalte enthalten, die in die Seite eingefügt werden sollen. Jedes Objekt sollte die Eigenschaften `selector`, `position`, `content`, `routes`, `excludeStatusCode` und `includeStatusCode` enthalten.

- `clientsideUrlRewrite`: Ein Boolean-Wert, der angibt, ob die URL auf der Clientseite umgeschrieben werden soll oder nicht.

### 🔭 Anwendungsbeispiel

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
>In diesem Beispiel wird die `handleProxyRequest` Funktion verwendet, um alle eingehenden Anfragen zu behandeln und sie an eine bestimmte Ziel-URL weiterzuleiten. Dabei werden verschiedene Konfigurationsoptionen verwendet, um das Verhalten der Funktion anzupassen. Die index.js Datei enthält bereits eine beispielkonfiguration.

## 🛟 ```getClientSideUrlRewriteScript(valuePairs = [])```
### 📖 Beschreibung
Im falle von der Ursprünglichen von mir erdachten Nutzung war es nötig Clientseitig generierte Links umzuschreiben. Da unser reverse-proxy ziel eine React-App ist, werden manche Links erst zur Laufzeit generiert. Diese funktion kann verwendet werden um ein JavaScript zu generieren, der eine Liste von ```from``` -> ```to``` value pairs enthält. Um diesen JavaScript zu verwenden, ist es möglich diesen über eine custom route selbst bereitzustellen. Ein beispiel für eine solche anwendung kann wie folgt aussehen:
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
> In diesem Beispiel wird die `getClientSideUrlRewriteScript` Funktion verwendet, um ein JavaScript zu generieren, das eine Liste von ```from``` -> ```to``` value pairs enthält. Dieses JavaScript wird dann über eine custom route bereitgestellt.
### 🎛️ Parameter
- `valuePairs`: Dies ist ein Array von Objekten, die Informationen über die URL-Umschreibung enthalten. Jedes Objekt sollte die Eigenschaften `from` (die URL, die ersetzt werden soll) und `to` (die URL, die die ursprüngliche URL ersetzen soll) enthalten.

# 🌤️ Cloudflare Schutz von Ziel-URL's und CNAMEs
Viele seiten blockieren durch Cloudflare berechtigterweise das aufrufen ihrer Seiten über ein Reverse Proxy. Sofern diese Anbieter uns aber die Möglichkeit geben, eine custom Domain mittels CNAME zu verwenden, können wir ein Workaround anwenden, der es uns ermöglicht die Seite dennoch über ein Reverse Proxy zu erreichen. Hierzu müssen wir lediglich eine Subdomain aufsetzen, die als CNAME auf die Ziel-URL zeigt. Anschließend können wir diese Subdomain als Ziel-URL verwenden. In einigen Fällen ist dies möglich, da der jeweilige provider zwar seine eigene Domains vor Reverse Proxie anfragen schützt, aber unsere custom Domains keinerlei spezifischen Schutzmaßnahmen unterliegen. Ein Beispiel für eine solche Konfiguration könnte wie folgt aussehen:
```
username.example.com <-[CNAME]-> temp.ourdomain.com <-[Reverse Proxy]-> ourdomain.com
```


# 📜 Lizenz
Dieses Projekt ist entwickelt worden von [VWGameDev](https://vwgame.dev) und wird unter der [MIT Lizenz](license.md) veröffentlicht.

*Copyright (c) 2024 Valentin Winkelmann*
### Verwendete Bibliotheken
- [Itty Router](https://github.com/kwhitley/itty-router) : Copyright (c) 2020 Kevin R. Whitley

---

# ⚠️ Haftungsausschluss
Ich übernehme keinerlei Haftung für Schäden, die durch die Verwendung dieses Projekts entstehen können und stelle dieses Projekt ohne jegliche Garantie zur Verfügung. Ich weise außerdem ausdrück darauf hin, das die Verwendung von Reverse Proxies nur mit der Erlaubnis des Betreibers der Ziel-URL's erfolgen sollte. Ferner übernehme ich keine gewährleistung für die Funktionalität, Sicherheit oder Zuverlässigkeit dieses Projekts. Freue mich aber über jegliches Feedback und Pull-Requests.