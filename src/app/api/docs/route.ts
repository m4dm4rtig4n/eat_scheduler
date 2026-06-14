export const dynamic = "force-dynamic";

// Versions pinnées + hashes SRI. À régénérer si on bump swagger-ui-dist :
//   curl -sL https://unpkg.com/swagger-ui-dist@VERSION/FILE \
//     | openssl dgst -sha384 -binary | openssl base64 -A
const SWAGGER_VERSION = "5.17.14";
const SWAGGER_CSS_SRI =
  "sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn";
const SWAGGER_JS_SRI =
  "sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep";

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Eat Scheduler · API docs</title>
  <link
    rel="stylesheet"
    href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css"
    integrity="${SWAGGER_CSS_SRI}"
    crossorigin="anonymous"
  />
  <style>
    /* Swagger UI est conçu pour un fond clair : on garde son thème natif,
       sinon le texte (gris foncé) devient illisible sur fond sombre. */
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="ui"></div>
  <script
    src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js"
    integrity="${SWAGGER_JS_SRI}"
    crossorigin="anonymous"
  ></script>
  <script>
    window.addEventListener("load", () => {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#ui",
        deepLinking: true,
        persistAuthorization: true,
        layout: "BaseLayout",
      });
    });
  </script>
</body>
</html>`;

export async function GET() {
  return new Response(HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Override la CSP stricte de l'app pour autoriser Swagger UI (CDN unpkg).
      "content-security-policy":
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://unpkg.com; " +
        "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
        "img-src 'self' data: https://unpkg.com; " +
        "connect-src 'self'; " +
        "font-src 'self' data:; " +
        "base-uri 'self'; " +
        "frame-ancestors 'none';",
    },
  });
}
