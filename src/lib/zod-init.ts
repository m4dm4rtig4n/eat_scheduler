import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Patche le prototype Zod pour ajouter .openapi(). DOIT être importé avant
// tout module qui construit des schemas Zod auxquels on appliquera ensuite
// .openapi() — sinon le patch arrive trop tard et la méthode est absente.
extendZodWithOpenApi(z);
