// @ts-nocheck

import { serveDir } from "jsr:@std/http@^0.224.1/file-server"

Deno.serve((req: Request) => {
    return serveDir(req, {
        fsRoot: "dist",
        quiet: true,
        showDirListing: false,
        showDotfiles: false,
    });
});
